package websocket

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type Client struct {
	ID     uuid.UUID
	UserID uuid.UUID
	Send   chan []byte
	Hub    *Hub
	conn   *websocket.Conn
}

type Hub struct {
	clients map[*Client]bool

	broadcast chan []byte

	register chan *Client

	unregister chan *Client

	mu sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

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

					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

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

			}
		}
	}

	return nil
}

func (h *Hub) GetConnectedUsers() int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	users := make(map[uuid.UUID]bool)
	for client := range h.clients {
		users[client.UserID] = true
	}

	return len(users)
}
