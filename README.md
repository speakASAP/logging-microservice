# Logging Microservice

Universal centralized logging service that can be deployed on any server with any domain. Collects, stores, and provides querying capabilities for logs from all microservices and applications. Designed to work seamlessly across different environments and technology stacks.

## ⚠️ Production-Ready Service

This service is **production-ready** and should **NOT** be modified directly.

- **✅ Allowed**: Use scripts from this service's directory
- **❌ NOT Allowed**: Modify code, configuration, or infrastructure directly
- **⚠️ Permission Required**: If you need to modify something, **ask for permission first**

## Implementation Status

✅ **Complete** - All features implemented and tested. The service is ready for production deployment.

## Features

### Core Functionality

- ✅ **Log Ingestion** - Receive logs from all services via HTTP API (`POST /api/logs`)
- ✅ **Log Storage** - File-based storage with daily rotation
- ✅ **Log Querying** - Query logs by service, level, date range (`GET /api/logs/query`)
- ✅ **Service Tracking** - Track logs per service (`GET /api/logs/services`)
- ✅ **Health Checks** - Built-in health endpoint (`GET /health`)
- ✅ **Error Handling** - Comprehensive error handling and fallback mechanisms

### Technical Implementation

- ✅ NestJS framework with TypeScript
- ✅ Winston logging with daily rotation
- ✅ Docker containerization
- ✅ Production-ready configuration
- ✅ Network integration (nginx-network)
- ✅ Health checks
- ✅ CORS support

## Technology Stack

- **Framework**: NestJS (TypeScript)
- **Logging**: Winston
- **File Rotation**: winston-daily-rotate-file
- **Container**: Docker

## API Interface

## 🔌 Port Configuration

**Port Range**: 33xx (shared microservices)

| Service | Host Port | Container Port | .env Variable | Description |
|---------|-----------|----------------|---------------|-------------|
| **Logging Service** | `${PORT:-3367}` | `${PORT:-3367}` | `PORT` (`.env`) | Centralized logging service |

**Note**:

- All ports are configured in `.env`. The values shown are defaults.
- All ports are exposed on `127.0.0.1` only (localhost) for security
- External access is provided via nginx-microservice reverse proxy at `https://${DOMAIN}` (configured in `.env`)

### Base URLs

**Internal Access** (Docker network):

```text
http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}
```

**External Access** (via HTTPS):

```text
https://${DOMAIN}
```

**Note**:

- For services on the same Docker network (`${NGINX_NETWORK_NAME:-nginx-network}`), use the internal URL: `http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}` (configured in `.env`)
- For external/public access, use: `https://${DOMAIN}` (configured in `.env`)
- The external URL is managed by nginx-microservice with automatic SSL certificate management

### API Endpoints

#### 1. Ingest Log

Send logs to the logging microservice.

**Endpoint**: `POST /api/logs`

**Content-Type**: `application/json`

**Request Body (DTO - Data Transfer Object)**:

The DTO (Data Transfer Object) defines the structure of data that services must send. Required and optional fields:

```json
{
  "level": "error|warn|info|debug",    // REQUIRED: Log level
  "message": "Log message",            // REQUIRED: Log message text
  "service": "service-name",           // REQUIRED: Name of the service sending the log
  "timestamp": "2024-01-01T00:00:00.000Z",  // OPTIONAL: ISO timestamp (auto-generated if omitted)
  "metadata": {                         // OPTIONAL: Additional key-value pairs
    "userId": 123,
    "action": "login",
    "ip": "192.168.1.1"
  }
}
```

**Field Details**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `level` | enum | ✅ Yes | One of: `"error"`, `"warn"`, `"info"`, `"debug"` |
| `message` | string | ✅ Yes | The log message (cannot be empty) |
| `service` | string | ✅ Yes | Service identifier (cannot be empty) |
| `timestamp` | string | ❌ No | ISO 8601 timestamp (e.g., `"2024-01-01T00:00:00.000Z"`). If omitted, current timestamp is used |
| `metadata` | object | ❌ No | Additional structured data as key-value pairs |

**Success Response** (200 OK):

```json
{
  "success": true,
  "message": "Log ingested successfully"
}
```

**Error Response** (400 Bad Request / 500 Internal Server Error):

```json
{
  "success": false,
  "message": "Failed to ingest log",
  "error": "Error description"
}
```

**Example Request**:

```bash
# Port configured in .env: PORT (default: 3367)
curl -X POST http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "User logged in successfully",
    "service": "user-service",
    "metadata": {
      "userId": 123,
      "ip": "192.168.1.1"
    }
  }'
```

**Example with Timestamp**:

```bash
# Port configured in .env: PORT (default: 3367)
curl -X POST http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "message": "Database connection failed",
    "service": "database-service",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "metadata": {
      "errorCode": "DB_CONN_001",
      "retryCount": 3
    }
  }'
```

#### 2. Query Logs

Retrieve logs with optional filtering.

**Endpoint**: `GET /api/logs/query`

**Query Parameters** (all optional):

| Parameter | Type | Description |
|-----------|------|-------------|
| `service` | string | Filter by service name |
| `level` | string | Filter by log level: `error`, `warn`, `info`, `debug` |
| `startDate` | string | Start date for filtering (ISO 8601 format) |
| `endDate` | string | End date for filtering (ISO 8601 format) |
| `limit` | number | Maximum number of logs to return (default: 100) |

**Example Request**:

```bash
# Port configured in .env: PORT (default: 3367)
curl "http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}/api/logs/query?service=user-service&level=error&startDate=2024-01-01&endDate=2024-01-31&limit=100"
```

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "level": "error",
      "message": "Database connection failed",
      "service": "user-service",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "metadata": {
        "errorCode": "DB_CONN_001"
      }
    }
  ],
  "count": 1
}
```

**Error Response** (500 Internal Server Error):

```json
{
  "success": false,
  "message": "Failed to query logs",
  "error": "Error description"
}
```

#### 3. Get Services

List all services that have sent logs.

**Endpoint**: `GET /api/logs/services`

**Example Request**:

```bash
# Port configured in .env: PORT (default: 3367)
curl http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}/api/logs/services
```

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": ["user-service", "product-service", "order-service"],
  "count": 3
}
```

**Error Response** (500 Internal Server Error):

```json
{
  "success": false,
  "message": "Failed to get services",
  "error": "Error description"
}
```

#### 4. Health Check

Check if the logging microservice is running and healthy.

**Endpoint**: `GET /health`

**Example Request**:

```bash
# Port configured in .env: PORT (default: 3367)
curl http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}/health
```

**Success Response** (200 OK):

```json
{
  "success": true,
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "logging-microservice"
}
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Service Configuration
SERVICE_NAME=logging-microservice
DOMAIN=logging.example.com

# Server Configuration
PORT=3367
NODE_ENV=production
CORS_ORIGIN=*

# Logging Configuration
LOG_LEVEL=info
LOG_STORAGE_PATH=./logs
LOG_ROTATION_MAX_SIZE=100m
LOG_ROTATION_MAX_FILES=10
LOG_TIMESTAMP_FORMAT=YYYY-MM-DD HH:mm:ss

# Network Configuration
NGINX_NETWORK_NAME=nginx-network

# Docker Volume Configuration
DOCKER_VOLUME_BASE_PATH=/srv/storagebox/docker-volumes
```

## Running the Service

### Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run start:dev
```

### Production with Docker

```bash
# Deploy to production
./scripts/deploy.sh

# Check status
./scripts/status.sh

# Update service
./scripts/update.sh
```

### Manual Docker Commands

```bash
# Build image
docker compose build

# Start service
docker compose up -d

# View logs
docker compose logs -f logging-service

# Stop service
docker compose down

# Restart service
docker compose restart logging-service
```

## Log Storage

Logs are stored in the following structure:

```text
logs/
  ├── application-YYYY-MM-DD.log  # All logs (rotated daily, JSON format)
  ├── error-YYYY-MM-DD.log         # Error logs only (rotated daily, JSON format)
  ├── service-name.log              # Service-specific logs (JSON format)
  └── service-name.human.log        # Service-specific logs (human-readable format)
```

### Log Formats

The service stores logs in **two formats**:

1. **JSON Format** (`service-name.log`):
   - Structured JSON format for automated analysis
   - One JSON object per line
   - Easy to parse programmatically
   - Used by query API endpoints

2. **Human-Readable Format** (`service-name.human.log`):
   - Easy to read with `tail`, `grep`, `less`
   - Format: `[YYYY-MM-DD HH:mm:ss] [LEVEL] [SERVICE] message | metadata`
   - Example: `[2024-01-01 12:00:00] [INFO ] [user-service      ] User logged in | {"userId":123}`

Log files are automatically rotated:

- Daily rotation based on date pattern
- Maximum file size: 100MB (configurable)
- Maximum files to keep: 10 (configurable)

## Integration Guide

### Overview

The Logging Microservice is designed to be a **universal centralized logging solution** that can be used by any service or application. It provides a simple HTTP API for log ingestion and querying, making it easy to integrate into any technology stack.

**Key Benefits**:
- ✅ **Universal** - Works with any programming language or framework
- ✅ **Simple** - HTTP REST API, no complex protocols
- ✅ **Flexible** - Configurable service name, domain, and ports
- ✅ **Reliable** - File-based storage with automatic rotation
- ✅ **Queryable** - Search and filter logs by service, level, date range
- ✅ **Production-ready** - Error handling, health checks, and monitoring

### How Other Services Use This Microservice

Other services and applications integrate with this logging microservice to:

Other services and applications can use this logging microservice by:

1. **Sending logs via HTTP POST** - Services send log entries to the microservice API
2. **Querying logs via HTTP GET** - Services can query logs for debugging and monitoring
3. **Service discovery** - Services automatically discover the logging service via Docker network or environment variables

### Service Discovery

Before integrating, you need to know how to connect to the logging microservice. The connection details are configured in the logging microservice's `.env` file:

**To find the service configuration**:

1. **If you have access to the logging microservice directory**:
   ```bash
   cd /path/to/logging-microservice
   cat .env | grep -E "SERVICE_NAME|DOMAIN|PORT"
   ```

2. **If you're using Docker**:
   ```bash
   # Find the service name
   docker ps | grep logging
   
   # Check environment variables
   docker exec logging-microservice env | grep -E "SERVICE_NAME|PORT"
   ```

3. **Common configuration values**:
   - `SERVICE_NAME`: Usually `logging-microservice` (used for Docker network discovery)
   - `DOMAIN`: External domain (e.g., `logging.example.com`)
   - `PORT`: Usually `3367` (default port for logging services)

**Connection URLs**:
- **Internal (Docker network)**: `http://${SERVICE_NAME}:${PORT}` (e.g., `http://logging-microservice:3367`)
- **External (HTTPS)**: `https://${DOMAIN}` (e.g., `https://logging.example.com`)

### Integration Steps

To integrate your service with the logging microservice, follow these steps:

#### 1. Network Configuration

Ensure your service is on the same Docker network as the logging microservice. The network name is configurable via `NGINX_NETWORK_NAME` environment variable (default: `nginx-network`).

```yaml
# In your service's docker-compose.yml
services:
  your-service:
    # ... your service configuration
    networks:
      - ${NGINX_NETWORK_NAME:-nginx-network}

networks:
  ${NGINX_NETWORK_NAME:-nginx-network}:
    external: true
    name: ${NGINX_NETWORK_NAME:-nginx-network}
```

**Note**: Replace `${NGINX_NETWORK_NAME:-nginx-network}` with the actual network name if you're using a different one. The logging microservice uses the value from its `.env` file.

#### 2. Service Configuration

Configure your service to connect to the logging microservice. You have two options:

**Option A: Direct Service Name (Recommended for Docker networks)**

If your service is on the same Docker network, use the service name directly:

```env
# In your service's .env file
LOGGING_SERVICE_URL=http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}
```

**Option B: External URL (For services outside Docker network)**

If your service is outside the Docker network, use the external HTTPS URL:

```env
# In your service's .env file
LOGGING_SERVICE_URL=https://${DOMAIN}
```

**Option C: Environment Variables (Most Flexible)**

You can also configure individual components:

```env
# In your service's .env file
LOGGING_SERVICE_NAME=logging-microservice  # Service name from logging-microservice/.env
LOGGING_SERVICE_PORT=3367                  # Port from logging-microservice/.env
LOGGING_SERVICE_DOMAIN=logging.example.com # Domain from logging-microservice/.env

# Then construct URL in your code:
# Internal: http://${LOGGING_SERVICE_NAME}:${LOGGING_SERVICE_PORT}
# External: https://${LOGGING_SERVICE_DOMAIN}
```

**Best Practice**: Use `LOGGING_SERVICE_URL` for simplicity, or use individual components if you need to switch between internal/external access dynamically.

#### 3. Send Logs via HTTP POST

Send logs using the API interface. The logging microservice accepts logs from any HTTP client. Here are implementation examples for different languages:

**JavaScript/TypeScript (Node.js/NestJS/Express)**:

```typescript
// utils/logger.ts
interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  service: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

async function sendLog(entry: LogEntry): Promise<void> {
  const loggingServiceUrl = process.env.LOGGING_SERVICE_URL || 
    `http://${process.env.LOGGING_SERVICE_NAME || 'logging-microservice'}:${process.env.LOGGING_SERVICE_PORT || 3367}`;
  
  try {
    const response = await fetch(`${loggingServiceUrl}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Logging service returned ${response.status}`);
    }
  } catch (error) {
    // Fallback to local logging
    console.error(`[${entry.level.toUpperCase()}] [${entry.service}] ${entry.message}`, entry.metadata);
  }
}

// Usage
await sendLog({
  level: 'info',
  message: 'User logged in successfully',
  service: 'user-service',
  metadata: { userId: 123, ip: '192.168.1.1' }
});
```

**Python (Django/Flask/FastAPI)**:

```python
# utils/logger.py
import os
import requests
from datetime import datetime
from typing import Optional, Dict, Literal

LogLevel = Literal['error', 'warn', 'info', 'debug']

def send_log(
    level: LogLevel,
    message: str,
    service: str,
    metadata: Optional[Dict] = None
) -> None:
    """Send log entry to centralized logging microservice."""
    logging_url = os.getenv('LOGGING_SERVICE_URL')
    if not logging_url:
        service_name = os.getenv('LOGGING_SERVICE_NAME', 'logging-microservice')
        port = os.getenv('LOGGING_SERVICE_PORT', '3367')
        logging_url = f'http://{service_name}:{port}'
    
    try:
        response = requests.post(
            f'{logging_url}/api/logs',
            json={
                'level': level,
                'message': message,
                'service': service,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'metadata': metadata or {}
            },
            headers={'Content-Type': 'application/json'},
            timeout=2  # Short timeout to avoid blocking
        )
        response.raise_for_status()
    except Exception as e:
        # Fallback to local logging
        print(f'[{level.upper()}] [{service}] {message}', metadata or {})

# Usage
send_log('info', 'User logged in successfully', 'user-service', {'userId': 123})
```

**Go (Golang)**:

```go
// utils/logger.go
package utils

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
    "time"
)

type LogLevel string

const (
    LogLevelError LogLevel = "error"
    LogLevelWarn  LogLevel = "warn"
    LogLevelInfo  LogLevel = "info"
    LogLevelDebug LogLevel = "debug"
)

type LogEntry struct {
    Level     LogLevel              `json:"level"`
    Message   string                 `json:"message"`
    Service   string                 `json:"service"`
    Timestamp string                 `json:"timestamp,omitempty"`
    Metadata  map[string]interface{} `json:"metadata,omitempty"`
}

func SendLog(level LogLevel, message, service string, metadata map[string]interface{}) {
    loggingURL := os.Getenv("LOGGING_SERVICE_URL")
    if loggingURL == "" {
        serviceName := getEnv("LOGGING_SERVICE_NAME", "logging-microservice")
        port := getEnv("LOGGING_SERVICE_PORT", "3367")
        loggingURL = fmt.Sprintf("http://%s:%s", serviceName, port)
    }
    
    entry := LogEntry{
        Level:     level,
        Message:   message,
        Service:   service,
        Timestamp: time.Now().UTC().Format(time.RFC3339),
        Metadata:  metadata,
    }
    
    jsonData, _ := json.Marshal(entry)
    
    client := &http.Client{Timeout: 2 * time.Second}
    resp, err := client.Post(loggingURL+"/api/logs", "application/json", bytes.NewBuffer(jsonData))
    if err != nil || resp.StatusCode != http.StatusOK {
        // Fallback to local logging
        fmt.Printf("[%s] [%s] %s %v\n", level, service, message, metadata)
        return
    }
    defer resp.Body.Close()
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

// Usage
SendLog(LogLevelInfo, "User logged in successfully", "user-service", map[string]interface{}{
    "userId": 123,
    "ip": "192.168.1.1",
})
```

**Java (Spring Boot)**:

```java
// utils/LoggerUtil.java
package com.example.utils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Component
public class LoggerUtil {
    
    @Value("${logging.service.url:http://logging-microservice:3367}")
    private String loggingServiceUrl;
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    public void sendLog(String level, String message, String service, Map<String, Object> metadata) {
        Map<String, Object> logEntry = new HashMap<>();
        logEntry.put("level", level);
        logEntry.put("message", message);
        logEntry.put("service", service);
        logEntry.put("timestamp", Instant.now().toString());
        if (metadata != null) {
            logEntry.put("metadata", metadata);
        }
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(logEntry, headers);
            
            restTemplate.postForEntity(loggingServiceUrl + "/api/logs", request, Map.class);
        } catch (Exception e) {
            // Fallback to local logging
            System.err.printf("[%s] [%s] %s %s%n", level.toUpperCase(), service, message, metadata);
        }
    }
}

// Usage
@Autowired
private LoggerUtil logger;

logger.sendLog("info", "User logged in successfully", "user-service", 
    Map.of("userId", 123, "ip", "192.168.1.1"));
```

**cURL / Shell Scripts**:

```bash
#!/bin/bash

# Load environment variables
LOGGING_SERVICE_URL=${LOGGING_SERVICE_URL:-http://logging-microservice:3367}

# Function to send log
send_log() {
    local level=$1
    local message=$2
    local service=$3
    shift 3
    local metadata="$@"
    
    curl -X POST "${LOGGING_SERVICE_URL}/api/logs" \
        -H "Content-Type: application/json" \
        -d "{
            \"level\": \"${level}\",
            \"message\": \"${message}\",
            \"service\": \"${service}\",
            \"metadata\": {${metadata}}
        }" \
        --silent --show-error --fail > /dev/null || \
        echo "[${level^^}] [${service}] ${message}" >&2
}

# Usage
send_log "info" "User logged in successfully" "user-service" "\"userId\": 123, \"ip\": \"192.168.1.1\""
```

#### 4. Query Logs (Optional)

Your service can also query logs from the logging microservice for debugging and monitoring:

```typescript
// Query logs by service, level, date range
async function queryLogs(filters: {
  service?: string;
  level?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const loggingServiceUrl = process.env.LOGGING_SERVICE_URL || 
    `http://${process.env.LOGGING_SERVICE_NAME || 'logging-microservice'}:${process.env.LOGGING_SERVICE_PORT || 3367}`;
  
  const params = new URLSearchParams();
  if (filters.service) params.append('service', filters.service);
  if (filters.level) params.append('level', filters.level);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.limit) params.append('limit', filters.limit.toString());
  
  const response = await fetch(`${loggingServiceUrl}/api/logs/query?${params}`);
  return await response.json();
}

// Usage: Get recent errors from your service
const errors = await queryLogs({
  service: 'user-service',
  level: 'error',
  limit: 10
});
```

#### 5. Error Handling and Best Practices

**Always implement fallback logging** in case the logging microservice is unavailable:

```typescript
async function sendLog(entry: LogEntry): Promise<void> {
  const loggingServiceUrl = process.env.LOGGING_SERVICE_URL || 
    `http://${process.env.LOGGING_SERVICE_NAME || 'logging-microservice'}:${process.env.LOGGING_SERVICE_PORT || 3367}`;
  
  try {
    const response = await fetch(`${loggingServiceUrl}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      // Important: Set timeout to avoid blocking
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Logging service returned ${response.status}`);
    }
  } catch (error) {
    // Fallback: log locally (console, file, or both)
    console.error(`[${entry.level.toUpperCase()}] [${entry.service}] ${entry.message}`, entry.metadata);
    
    // Optionally write to local file
    // fs.appendFileSync('local-logs.log', JSON.stringify(entry) + '\n');
  }
}
```

**Best Practices**:

1. **Use async/non-blocking calls** - Don't block your application waiting for log responses
2. **Set timeouts** - Use short timeouts (1-2 seconds) to avoid hanging requests
3. **Implement retries** - For critical logs, implement retry logic (but don't retry forever)
4. **Fallback logging** - Always have a local fallback (console, file, or both)
5. **Batch logs** - For high-volume services, consider batching multiple logs in a single request
6. **Don't log sensitive data** - Never log passwords, tokens, or PII in metadata
7. **Use appropriate log levels** - Use `error` for errors, `warn` for warnings, `info` for informational, `debug` for debugging
8. **Include context** - Always include relevant metadata (userId, requestId, etc.) for better debugging

### Real-World Integration Examples

#### Example 1: NestJS/Express Application

```typescript
// src/common/interceptors/logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const startTime = Date.now();
    
    return next.handle().pipe(
      tap(async () => {
        const responseTime = Date.now() - startTime;
        await sendLog({
          level: 'info',
          message: `${method} ${url} - ${responseTime}ms`,
          service: 'api-gateway',
          metadata: {
            method,
            url,
            ip,
            responseTime,
            statusCode: context.switchToHttp().getResponse().statusCode,
          },
        });
      }),
    );
  }
}
```

#### Example 2: Express Middleware

```typescript
// middleware/logger.middleware.ts
import { Request, Response, NextFunction } from 'express';

export function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    await sendLog({
      level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      message: `${req.method} ${req.path} - ${res.statusCode}`,
      service: 'web-service',
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });
  });
  
  next();
}
```

#### Example 3: Error Handler Integration

```typescript
// utils/error-handler.ts
export async function handleError(error: Error, context: any) {
  // Log to centralized service
  await sendLog({
    level: 'error',
    message: error.message,
    service: 'user-service',
    metadata: {
      error: error.name,
      stack: error.stack,
      ...context,
    },
  });
  
  // Also log locally for immediate visibility
  console.error('Error occurred:', error, context);
}
```

#### Example 4: Database Operation Logging

```typescript
// services/user.service.ts
async function createUser(userData: UserData) {
  try {
    const user = await db.users.create(userData);
    
    await sendLog({
      level: 'info',
      message: 'User created successfully',
      service: 'user-service',
      metadata: {
        userId: user.id,
        email: user.email,
        action: 'user.create',
      },
    });
    
    return user;
  } catch (error) {
    await sendLog({
      level: 'error',
      message: 'Failed to create user',
      service: 'user-service',
      metadata: {
        error: error.message,
        userData: { email: userData.email }, // Don't log full userData for security
        action: 'user.create',
      },
    });
    throw error;
  }
}
```

### Configuration Summary

**For services on the same Docker network** (recommended):
```env
LOGGING_SERVICE_URL=http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}
```

**For services outside Docker network**:
```env
LOGGING_SERVICE_URL=https://${DOMAIN}
```

**For flexible configuration**:
```env
LOGGING_SERVICE_NAME=logging-microservice
LOGGING_SERVICE_PORT=3367
LOGGING_SERVICE_DOMAIN=logging.example.com
# Then construct URL in code based on network location
```

**Note**: 
- Use the **internal Docker network URL** (`http://${SERVICE_NAME}:${PORT}`) for services on the same Docker network - this is faster and doesn't require SSL
- Use the **external HTTPS URL** (`https://${DOMAIN}`) for services outside the Docker network or for external access
- The service name, port, and domain are configured in the logging microservice's `.env` file

### Quick Reference for Integration

**Minimum setup to start logging**:

1. **Add to your service's `.env`**:
   ```env
   LOGGING_SERVICE_URL=http://logging-microservice:3367
   ```

2. **Send a log** (any language):
   ```bash
   curl -X POST http://logging-microservice:3367/api/logs \
     -H "Content-Type: application/json" \
     -d '{
       "level": "info",
       "message": "Service started",
       "service": "my-service"
     }'
   ```

3. **Query logs**:
   ```bash
   curl "http://logging-microservice:3367/api/logs/query?service=my-service&limit=10"
   ```

**Common use cases**:
- ✅ **Application logs** - Log all application events, errors, and info
- ✅ **Request logging** - Log HTTP requests/responses in middleware
- ✅ **Error tracking** - Centralize error logs from all services
- ✅ **Audit logs** - Track user actions and system events
- ✅ **Debugging** - Query logs by service, level, or time range
- ✅ **Monitoring** - Aggregate logs from multiple services in one place

**Supported log levels**:
- `error` - Errors that need immediate attention
- `warn` - Warnings that should be reviewed
- `info` - Informational messages (default)
- `debug` - Debug information (verbose)

**API Endpoints Summary**:
- `POST /api/logs` - Send a log entry
- `GET /api/logs/query` - Query logs with filters
- `GET /api/logs/services` - List all services that have sent logs
- `GET /health` - Health check endpoint

## Production Deployment

### Prerequisites

1. Docker and Docker Compose installed
2. Access to production server
3. `${NGINX_NETWORK_NAME:-nginx-network}` Docker network exists (created by nginx-microservice)
4. nginx-microservice running and configured

### Deployment Steps

#### Step 1: Pull Latest Code

```bash
cd ${PROJECT_BASE_PATH:-/home/user}/logging-microservice
git pull origin main
```

#### Step 2: Configure Environment

Ensure `.env` file exists with production values:

```bash
cd ${PROJECT_BASE_PATH:-/home/user}/logging-microservice
cat .env  # Verify configuration
# PORT, SERVICE_NAME, DOMAIN should be set
```

#### Step 3: Deploy Service

```bash
cd ${PROJECT_BASE_PATH:-/home/user}/logging-microservice
./scripts/deploy.sh
```

This will:

- Build Docker image
- Start the service on port ${PORT:-3367} (configured in `.env`)
- Connect to ${NGINX_NETWORK_NAME:-nginx-network}
- Run health checks

#### Step 4: Register with nginx-microservice

The service needs to be registered in nginx-microservice for external access:

1. **Service Registry** (already configured):
   - File: `${PROJECT_BASE_PATH:-/home/user}/nginx-microservice/service-registry/${SERVICE_NAME:-logging-microservice}.json`
   - Contains service configuration for blue/green deployment

2. **Register Domain** (if not already done):

   ```bash
   cd ${PROJECT_BASE_PATH:-/home/user}/nginx-microservice
   ./scripts/add-domain.sh ${DOMAIN} ${SERVICE_NAME:-logging-microservice} ${PORT:-3367} admin@${DOMAIN#*.}
   ```

   This will:
   - Create nginx configuration
   - Request SSL certificate from Let's Encrypt
   - Configure HTTPS access

3. **Verify Domain Registration**:

   ```bash
   # Check nginx config
   docker exec nginx-microservice nginx -t
   
   # Test external access
   curl https://${DOMAIN}/health
   ```

#### Step 5: Verify Deployment

```bash
# Check service status
cd ${PROJECT_BASE_PATH:-/home/user}/logging-microservice
./scripts/status.sh

# Test internal access
docker run --rm --network ${NGINX_NETWORK_NAME:-nginx-network} alpine/curl:latest \
  curl -s http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}/health

# Test external access
curl https://${DOMAIN}/health
```

### Access Points

The service is accessible via:

1. **Internal Access** (within Docker network):
   - URL: `http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}` (configured in `.env`)
   - Used by other microservices on the same network
   - No SSL required (internal network)

2. **External Access** (via HTTPS):
   - URL: `https://${DOMAIN}` (configured in `.env`)
   - Public internet access
   - SSL certificate managed by nginx-microservice
   - Certificate auto-renewal via Let's Encrypt

### Network Configuration

The service must be on the `${NGINX_NETWORK_NAME:-nginx-network}` Docker network to be accessible by other microservices. The docker-compose.yml automatically connects to this network.

To verify network connection:

```bash
docker network inspect ${NGINX_NETWORK_NAME:-nginx-network} | grep ${SERVICE_NAME:-logging-microservice}
```

### Service Registry

The service is registered in nginx-microservice's service registry for blue/green deployment support:

- **Registry File**: `${PROJECT_BASE_PATH:-/home/user}/nginx-microservice/service-registry/${SERVICE_NAME:-logging-microservice}.json`
- **State File**: `${PROJECT_BASE_PATH:-/home/user}/nginx-microservice/state/${SERVICE_NAME:-logging-microservice}.json`

The registry contains:

- Service name and paths
- Container configuration
- Health check endpoints
- Port configuration (${PORT:-3367}, configured in `.env`)

### Blue/Green Deployment

The service supports blue/green deployment via nginx-microservice:

```bash
cd ${PROJECT_BASE_PATH:-/home/user}/nginx-microservice
./scripts/blue-green/deploy.sh ${SERVICE_NAME:-logging-microservice}
```

This will:

1. Build and start new deployment (green)
2. Run health checks
3. Switch traffic to new deployment
4. Monitor and cleanup old deployment

See [nginx-microservice Blue/Green Deployment Guide](https://github.com/speakASAP/nginx-microservice/blob/master/docs/BLUE_GREEN_DEPLOYMENT.md) for details.

## Troubleshooting

### Service Not Starting

```bash
# Check logs
docker compose logs logging-service

# Check if port is in use
# Port configured in .env: PORT (default: 3367)
netstat -tuln | grep ${PORT:-3367}

# Check Docker network
docker network inspect ${NGINX_NETWORK_NAME:-nginx-network}
```

### Health Check Failing

```bash
# Test health endpoint manually
# Port configured in .env: PORT (default: 3367)
docker exec ${SERVICE_NAME:-logging-microservice} wget -q -O- http://localhost:${PORT:-3367}/health

# Check service logs
docker compose logs -f logging-service
```

### Logs Not Being Stored

```bash
# Check log directory permissions
ls -la logs/

# Check disk space
df -h

# Check service logs for errors
docker compose logs logging-service | grep -i error
```

### Network Issues

```bash
# Verify service is on network
docker network inspect ${NGINX_NETWORK_NAME:-nginx-network}

# Test connectivity from another container
docker run --rm --network ${NGINX_NETWORK_NAME:-nginx-network} alpine/curl:latest \
  curl -s http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}/health
```

## Maintenance

### Viewing Logs

```bash
# View service logs
docker compose logs -f logging-service

# View application logs
tail -f logs/application-$(date +%Y-%m-%d).log

# View error logs
tail -f logs/error-$(date +%Y-%m-%d).log

# View service-specific logs
tail -f logs/service-name.log
```

### Updating Service

```bash
# Pull latest code
git pull origin main

# Update and restart
./scripts/update.sh
```

### Backup Logs

Logs are stored in `./logs/` directory. To backup:

```bash
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

## Microservice Development

### Project Structure

```text
logging-microservice/
├── src/
│   ├── main.ts              # Application entry point
│   ├── app.module.ts        # Root module
│   ├── logs/                # Logs module
│   │   ├── logs.controller.ts
│   │   ├── logs.service.ts
│   │   ├── logs.module.ts
│   │   └── dto/             # Data transfer objects
│   └── health/              # Health check
│       └── health.controller.ts
├── scripts/                 # Deployment scripts
│   ├── deploy.sh
│   ├── status.sh
│   ├── update.sh
│   └── test.sh
├── logs/                    # Log storage (created at runtime)
├── docker-compose.yml       # Docker configuration
├── Dockerfile              # Docker image definition
├── package.json            # Dependencies
└── README.md               # This file
```

### Building

```bash
# Build TypeScript
npm run build

# Build Docker image
docker compose build
```

### Testing

Run the test script:

```bash
./scripts/test.sh
```

Or test manually:

```bash
# Health check
# Port configured in .env: PORT (default: 3367)
curl http://localhost:${PORT:-3367}/health

# Send log
# Port configured in .env: PORT (default: 3367)
curl -X POST http://localhost:${PORT:-3367}/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test log",
    "service": "test-service"
  }'

# Query logs
# Port configured in .env: PORT (default: 3367)
curl "http://localhost:${PORT:-3367}/api/logs/query?service=test-service&limit=10"
```

Or run unit tests:

```bash
npm test
```

## Error Handling

The service implements comprehensive error handling:

- ✅ Try-catch blocks in all service methods
- ✅ Error logging to Winston
- ✅ HTTP error responses with proper status codes
- ✅ Graceful degradation (doesn't crash on errors)
- ✅ Validation errors handled by NestJS pipes

## Security

Security measures implemented:

- ✅ Input validation via class-validator
- ✅ CORS configuration
- ✅ No sensitive data in logs (handled by caller)
- ✅ File system permissions handled by Docker

## Performance

Performance optimizations:

- ✅ Async log ingestion (non-blocking)
- ✅ File append operations (efficient)
- ✅ Winston buffering
- ✅ Health checks for monitoring

## Monitoring

Monitoring capabilities:

- ✅ Docker health checks
- ✅ Health endpoint (`/health`)
- ✅ Service status script (`./scripts/status.sh`)
- ✅ Log file monitoring

## Notes

Important implementation details:

- **Port**: Service runs on port `${PORT:-3367}` (both container and host, configured in `.env`)
- **Network**: Must be on `${NGINX_NETWORK_NAME:-nginx-network}` for service discovery
- **Log Storage**: Logs persist in `./logs/` directory (mounted volume on host filesystem)
- **Storage Format**: Dual format - JSON (`{service}.log`) and human-readable (`{service}.human.log`)
- **Database**: No database required (file-based storage)
- **External Access**: Available via `https://${DOMAIN}` (managed by nginx-microservice, configured in `.env`)
- **Internal Access**: Available via `http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}` (Docker network, configured in `.env`)
- **SSL Certificates**: Managed automatically by nginx-microservice via Let's Encrypt
- **Future Enhancement**: Can be enhanced with database for better querying if needed

## Success Criteria

The service is considered successful when:

✅ Service starts successfully
✅ Health check passes
✅ Log ingestion works
✅ Log querying works
✅ Service listing works
✅ Docker health checks pass
✅ Integration with other services verified
✅ Documentation complete
✅ Deployment scripts ready

## License

Universal logging microservice - can be integrated into any platform or application.
