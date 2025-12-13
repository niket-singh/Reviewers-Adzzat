# Build stage
FROM golang:1.23-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server ./cmd/api

# Runtime stage
FROM alpine:latest

# Install runtime dependencies: ca-certificates for HTTPS, git for cloning repos, docker for building images
RUN apk --no-cache add ca-certificates git docker

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/server .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./server"]
