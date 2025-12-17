package middleware

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)


func CORSMiddleware() gin.HandlerFunc {
	allowedOrigins := strings.Split(os.Getenv("CORS_ORIGINS"), ",")
	if len(allowedOrigins) == 0 || allowedOrigins[0] == "" {
		allowedOrigins = []string{"http://localhost:3000"}
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			trimmedOrigin := strings.TrimSpace(allowedOrigin)
			if trimmedOrigin == origin || trimmedOrigin == "*" {
				allowed = true
				break
			}
		}

		
		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else if origin != "" {
			
			println("CORS: Origin not in allowed list:", origin)
			println("CORS: Allowed origins:", strings.Join(allowedOrigins, ", "))
			
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Max-Age", "3600")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
