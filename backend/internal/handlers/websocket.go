package handlers

import (
	"log"
	"net/http"

	"github.com/adzzatxperts/backend/internal/websocket"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	gorillaws "github.com/gorilla/websocket"
)

var upgrader = gorillaws.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// TODO: In production, implement proper origin checking
		// For now, allow all origins (CORS handled by middleware)
		return true
	},
}

// Global WebSocket hub instance
var WSHub *websocket.Hub

// InitWebSocket initializes the WebSocket hub
func InitWebSocket() {
	WSHub = websocket.NewHub()
	go WSHub.Run()
	log.Println("✓ WebSocket hub initialized")
}

// HandleWebSocket handles WebSocket connection requests
func HandleWebSocket(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDInterface, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userIDStr, ok := userIDInterface.(string)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID format"})
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Create new client
	client := &websocket.Client{
		ID:     uuid.New(),
		UserID: userID,
		Send:   make(chan []byte, 256),
		Hub:    WSHub,
	}

	// Serve WebSocket connection
	client.ServeWS(conn)
}

// BroadcastSubmissionUpdate sends a submission update to all connected clients
func BroadcastSubmissionUpdate(submissionID uuid.UUID, status string) {
	if WSHub != nil {
		WSHub.BroadcastToAll("submission_update", gin.H{
			"submissionId": submissionID,
			"status":       status,
			"timestamp":    "now",
		})
	}
}

// BroadcastNotification sends a notification to a specific user
func BroadcastNotification(userID uuid.UUID, title, message string) {
	if WSHub != nil {
		WSHub.BroadcastToUser(userID, "notification", gin.H{
			"title":   title,
			"message": message,
		})
	}
}
