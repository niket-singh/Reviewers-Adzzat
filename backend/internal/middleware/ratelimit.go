package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// OPTIMIZED: High-performance in-memory rate limiter for 200+ concurrent users
type rateLimiter struct {
	requests map[string][]time.Time
	mu       sync.RWMutex
}

var limiter = &rateLimiter{
	requests: make(map[string][]time.Time),
}

// RateLimitMiddleware limits requests per IP address - OPTIMIZED FOR HIGH CONCURRENCY
// Default: 1000 requests per minute per IP (increased from 100 for 200+ concurrent users)
func RateLimitMiddleware(requestsPerMinute int) gin.HandlerFunc {
	if requestsPerMinute == 0 {
		requestsPerMinute = 1000 // Default to 1000 for high concurrency
	}

	// Aggressive cleanup every 2 minutes to free memory faster
	go func() {
		ticker := time.NewTicker(2 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			limiter.mu.Lock()
			now := time.Now()
			for ip, timestamps := range limiter.requests {
				// Remove timestamps older than 1 minute
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

		// Use RLock for reading to allow multiple concurrent reads
		limiter.mu.RLock()
		timestamps := limiter.requests[ip]
		limiter.mu.RUnlock()

		now := time.Now()

		// Optimize: Pre-allocate slice with capacity
		valid := make([]time.Time, 0, len(timestamps)+1)
		for _, t := range timestamps {
			if now.Sub(t) < time.Minute {
				valid = append(valid, t)
			}
		}

		// Check if rate limit exceeded BEFORE acquiring write lock
		if len(valid) >= requestsPerMinute {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		// Only acquire write lock when needed
		limiter.mu.Lock()
		valid = append(valid, now)
		limiter.requests[ip] = valid
		limiter.mu.Unlock()

		c.Next()
	}
}
