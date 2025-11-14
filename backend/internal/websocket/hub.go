package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Message represents a WebSocket message
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// Client represents a connected WebSocket client
type Client struct {
	ID     uuid.UUID
	UserID uuid.UUID
	Send   chan []byte
	Hub    *Hub
	conn   *websocket.Conn
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from clients
	broadcast chan []byte

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Mutex for thread-safe operations
	mu sync.RWMutex
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client registered: %s (User: %s)", client.ID, client.UserID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				log.Printf("Client unregistered: %s", client.ID)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					// Client's send buffer is full, close and remove
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastToAll sends a message to all connected clients
func (h *Hub) BroadcastToAll(messageType string, data interface{}) error {
	msg := Message{
		Type: messageType,
		Data: data,
	}

	jsonMsg, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	h.broadcast <- jsonMsg
	return nil
}

// BroadcastToUser sends a message to a specific user
func (h *Hub) BroadcastToUser(userID uuid.UUID, messageType string, data interface{}) error {
	msg := Message{
		Type: messageType,
		Data: data,
	}

	jsonMsg, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.UserID == userID {
			select {
			case client.Send <- jsonMsg:
			default:
				// Client's send buffer is full, skip
			}
		}
	}

	return nil
}

// GetConnectedUsers returns the count of unique connected users
func (h *Hub) GetConnectedUsers() int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make(map[uuid.UUID]bool)
	for client := range h.clients {
		users[client.UserID] = true
	}

	return len(users)
}
