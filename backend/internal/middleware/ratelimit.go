package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)


type rateLimiter struct {
	requests map[string][]time.Time
	mu       sync.RWMutex
}

var limiter = &rateLimiter{
	requests: make(map[string][]time.Time),
}


func RateLimitMiddleware(requestsPerMinute int) gin.HandlerFunc {
	if requestsPerMinute == 0 {
		requestsPerMinute = 1000 
	}

	
	go func() {
		ticker := time.NewTicker(2 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			limiter.mu.Lock()
			now := time.Now()
			for ip, timestamps := range limiter.requests {
				
				valid := make([]time.Time, 0, len(timestamps))
				for _, t := range timestamps {
					if now.Sub(t) < time.Minute {
						valid = append(valid, t)
					}
				}
				if len(valid) == 0 {
					delete(limiter.requests, ip)
				} else {
					limiter.requests[ip] = valid
				}
			}
			limiter.mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		ip := c.ClientIP()

		
		limiter.mu.RLock()
		timestamps := limiter.requests[ip]
		limiter.mu.RUnlock()

		now := time.Now()

		
		valid := make([]time.Time, 0, len(timestamps)+1)
		for _, t := range timestamps {
			if now.Sub(t) < time.Minute {
				valid = append(valid, t)
			}
		}

		
		if len(valid) >= requestsPerMinute {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		
		limiter.mu.Lock()
		valid = append(valid, now)
		limiter.requests[ip] = valid
		limiter.mu.Unlock()

		c.Next()
	}
}
