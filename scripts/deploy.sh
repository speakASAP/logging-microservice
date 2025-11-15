#!/bin/bash

# Logging Microservice Deployment Script
# Deploys the logging microservice to production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=========================================="
echo "Logging Microservice Deployment"
echo "=========================================="

cd "$PROJECT_DIR"

# Check if .env file exists
if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found"
  echo "Creating .env from .env.example if it exists..."
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "✅ Created .env from .env.example"
    echo "⚠️  Please update .env with your configuration"
  else
    echo "❌ .env.example not found. Please create .env manually"
    exit 1
  fi
fi

# Check if nginx-network exists
echo "Checking Docker network..."
if ! docker network inspect nginx-network >/dev/null 2>&1; then
  echo "❌ nginx-network not found. Please ensure nginx-microservice is running."
  exit 1
fi
echo "✅ nginx-network found"

# Ensure logs directory exists
echo "Ensuring logs directory exists..."
mkdir -p logs
touch logs/.gitkeep
echo "✅ Logs directory ready"

# Build and start the service
echo "Building Docker image..."
docker compose build

echo "Starting logging microservice..."
docker compose up -d

# Wait for service to be healthy
echo "Waiting for service to be healthy..."
sleep 5

# Check health
if docker compose exec -T logging-service wget --quiet --tries=1 --spider http://localhost:3268/health 2>/dev/null; then
  echo "✅ Logging microservice is healthy"
else
  echo "⚠️  Health check failed, but service may still be starting..."
  echo "Check logs with: docker compose logs -f logging-service"
fi

# Display status
echo ""
echo "=========================================="
echo "Deployment Complete"
echo "=========================================="
echo "Service: logging-microservice"
echo "Port: 3268"
echo "Network: nginx-network"
echo ""
echo "Useful commands:"
echo "  View logs: docker compose logs -f logging-service"
echo "  Check status: docker compose ps"
echo "  Stop service: docker compose down"
echo "  Restart service: docker compose restart logging-service"
echo "=========================================="

