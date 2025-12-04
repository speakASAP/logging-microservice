#!/bin/bash

# Logging Microservice Test Script
# Tests the logging service endpoints

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

PORT=${PORT:-3367}
SERVICE_URL="${1:-http://localhost:${PORT}}"

echo "=========================================="
echo "Testing Logging Microservice"
echo "Service URL: $SERVICE_URL"
echo "=========================================="

# Test health endpoint
echo ""
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$SERVICE_URL/health" || echo "FAILED")
if echo "$HEALTH_RESPONSE" | grep -q "success"; then
  echo "✅ Health check passed"
  echo "   Response: $HEALTH_RESPONSE"
else
  echo "❌ Health check failed"
  echo "   Response: $HEALTH_RESPONSE"
  exit 1
fi

# Test log ingestion
echo ""
echo "2. Testing log ingestion..."
LOG_RESPONSE=$(curl -s -X POST "$SERVICE_URL/api/logs" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test log message",
    "service": "test-service",
    "metadata": {
      "test": true,
      "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
    }
  }' || echo "FAILED")

if echo "$LOG_RESPONSE" | grep -q "success"; then
  echo "✅ Log ingestion passed"
  echo "   Response: $LOG_RESPONSE"
else
  echo "❌ Log ingestion failed"
  echo "   Response: $LOG_RESPONSE"
  exit 1
fi

# Test error log ingestion
echo ""
echo "3. Testing error log ingestion..."
ERROR_LOG_RESPONSE=$(curl -s -X POST "$SERVICE_URL/api/logs" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "message": "Test error message",
    "service": "test-service",
    "metadata": {
      "error": "Test error",
      "stack": "test stack trace"
    }
  }' || echo "FAILED")

if echo "$ERROR_LOG_RESPONSE" | grep -q "success"; then
  echo "✅ Error log ingestion passed"
  echo "   Response: $ERROR_LOG_RESPONSE"
else
  echo "❌ Error log ingestion failed"
  echo "   Response: $ERROR_LOG_RESPONSE"
  exit 1
fi

# Wait a moment for logs to be written
sleep 1

# Test query logs
echo ""
echo "4. Testing log query..."
QUERY_RESPONSE=$(curl -s "$SERVICE_URL/api/logs/query?service=test-service&limit=10" || echo "FAILED")
if echo "$QUERY_RESPONSE" | grep -q "success"; then
  echo "✅ Log query passed"
  LOG_COUNT=$(echo "$QUERY_RESPONSE" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")
  echo "   Found $LOG_COUNT logs"
else
  echo "❌ Log query failed"
  echo "   Response: $QUERY_RESPONSE"
  exit 1
fi

# Test get services
echo ""
echo "5. Testing get services..."
SERVICES_RESPONSE=$(curl -s "$SERVICE_URL/api/logs/services" || echo "FAILED")
if echo "$SERVICES_RESPONSE" | grep -q "success"; then
  echo "✅ Get services passed"
  SERVICE_COUNT=$(echo "$SERVICES_RESPONSE" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")
  echo "   Found $SERVICE_COUNT services"
  echo "   Response: $SERVICES_RESPONSE"
else
  echo "❌ Get services failed"
  echo "   Response: $SERVICES_RESPONSE"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ All tests passed!"
echo "=========================================="

