#!/bin/bash

# PDFMonkey MCP Server - Docker Runner Script
# This script manages the Docker container for the PDFMonkey MCP Server

set -e

CONTAINER_NAME="pdfmonkey-mcp-server"
IMAGE_NAME="pdfmonkey-mcp-server:latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if API key is set
if [ -z "$PDFMONKEY_API_KEY" ]; then
    echo -e "${RED}Error: PDFMONKEY_API_KEY environment variable is not set${NC}"
    echo "Usage: export PDFMONKEY_API_KEY='your-api-key' && $0"
    exit 1
fi

# Function to check if container exists
container_exists() {
    docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Function to check if container is running
container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"
}

# Function to check if image exists
image_exists() {
    docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}$"
}

# Build image if it doesn't exist
if ! image_exists; then
    echo -e "${YELLOW}Image not found. Building...${NC}"

    # Check if dist directory exists
    if [ ! -d "dist" ]; then
        echo -e "${YELLOW}dist/ not found. Running npm build...${NC}"
        npm run build
    fi

    docker build -t "$IMAGE_NAME" .
    echo -e "${GREEN}Image built successfully${NC}"
fi

# Remove existing container if it exists but is stopped
if container_exists && ! container_running; then
    echo -e "${YELLOW}Removing stopped container...${NC}"
    docker rm "$CONTAINER_NAME"
fi

# Start container if not running
if ! container_running; then
    echo -e "${YELLOW}Starting container...${NC}"
    docker run -d -i \
        --name "$CONTAINER_NAME" \
        -e PDFMONKEY_API_KEY="$PDFMONKEY_API_KEY" \
        "$IMAGE_NAME"

    # Wait a moment for container to start
    sleep 1

    if container_running; then
        echo -e "${GREEN}Container started successfully${NC}"
    else
        echo -e "${RED}Failed to start container${NC}"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
else
    echo -e "${GREEN}Container already running${NC}"
fi

# Execute the MCP server
echo -e "${GREEN}Connecting to MCP server...${NC}"
exec docker exec -i "$CONTAINER_NAME" node /app/dist/index.js
