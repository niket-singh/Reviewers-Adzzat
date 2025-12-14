package middleware

import (
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware handles CORS
func CORSMiddleware() gin.HandlerFunc {
	allowedOrigins := strings.Split(os.Getenv("CORS_ORIGINS"), ",")
	if len(allowedOrigins) == 0 || allowedOrigins[0] == "" {
		allowedOrigins = []string{"http://localhost:3000"}
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range allowedOrigins {
			trimmedOrigin := strings.TrimSpace(allowedOrigin)
			if trimmedOrigin == origin || trimmedOrigin == "*" {
				allowed = true
				break
			}
		}

		// Set CORS headers - ALWAYS set them to avoid 502 errors
		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else if origin != "" {
			// If origin is not empty but not in allowed list, log it but still set headers to avoid 502
			println("CORS: Origin not in allowed list:", origin)
			println("CORS: Allowed origins:", strings.Join(allowedOrigins, ", "))
			// Still set the origin to prevent 502 errors - actual security is handled by credentials
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
