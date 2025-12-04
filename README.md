# Logging Microservice

Centralized logging service for the FlipFlop.cz e-commerce platform. Collects, stores, and provides querying capabilities for logs from all microservices.

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
| **Logging Service** | `${PORT:-3367}` | `${PORT:-3367}` | `PORT` (logging-microservice/.env) | Centralized logging service |

**Note**:

- All ports are configured in `logging-microservice/.env`. The values shown are defaults.
- All ports are exposed on `127.0.0.1` only (localhost) for security
- External access is provided via nginx-microservice reverse proxy at `https://logging.statex.cz`

### Base URLs

**Internal Access** (Docker network):

```text
http://logging-microservice:${PORT:-3367}
```

**External Access** (via HTTPS):

```text
https://logging.statex.cz
```

**Note**:

- For services on the same Docker network (`nginx-network`), use the internal URL: `http://logging-microservice:${PORT:-3367}` (port configured in `logging-microservice/.env`)
- For external/public access, use: `https://logging.statex.cz`
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
# Port configured in logging-microservice/.env: PORT (default: 3367)
curl -X POST http://logging-microservice:${PORT:-3367}/api/logs \
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
# Port configured in logging-microservice/.env: PORT (default: 3367)
curl -X POST http://logging-microservice:${PORT:-3367}/api/logs \
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
# Port configured in logging-microservice/.env: PORT (default: 3367)
curl "http://logging-microservice:${PORT:-3367}/api/logs/query?service=user-service&level=error&startDate=2024-01-01&endDate=2024-01-31&limit=100"
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
# Port configured in logging-microservice/.env: PORT (default: 3367)
curl http://logging-microservice:${PORT:-3367}/api/logs/services
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
# Port configured in logging-microservice/.env: PORT (default: 3367)
curl http://logging-microservice:${PORT:-3367}/health
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
# Server Configuration
PORT=3367  # Configured in logging-microservice/.env (default: 3367)
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

### For Services Using the Logging Microservice

To integrate your service with the logging microservice, you need to:

#### 1. Network Configuration

Ensure your service is on the same Docker network (`nginx-network`):

```yaml
# In your service's docker-compose.yml
networks:
  - nginx-network

networks:
  nginx-network:
    external: true
    name: nginx-network
```

#### 2. Service Configuration

Set the logging service URL in your service's environment variables:

```env
LOGGING_SERVICE_URL=http://logging-microservice:${PORT:-3367}  # PORT configured in logging-microservice/.env
```

#### 3. Send Logs via HTTP POST

Send logs using the API interface defined above. Example implementations:

**JavaScript/TypeScript (Node.js)**:

```typescript
async function sendLog(level: string, message: string, service: string, metadata?: any) {
  try {
    // Port configured in logging-microservice/.env: PORT (default: 3367)
    const response = await fetch('http://logging-microservice:${PORT:-3367}/api/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        message,
        service,
        timestamp: new Date().toISOString(),
        metadata,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to send log:', error);
    // Fallback to local logging
  }
}

// Usage
await sendLog('info', 'User logged in', 'user-service', { userId: 123 });
```

**Python**:

```python
import requests
from datetime import datetime

def send_log(level: str, message: str, service: str, metadata: dict = None):
    try:
        response = requests.post(
            'http://logging-microservice:${PORT:-3367}/api/logs',  # PORT configured in logging-microservice/.env
            json={
                'level': level,
                'message': message,
                'service': service,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'metadata': metadata or {}
            },
            headers={'Content-Type': 'application/json'}
        )
        return response.json()
    except Exception as e:
        print(f'Failed to send log: {e}')
        # Fallback to local logging

# Usage
send_log('info', 'User logged in', 'user-service', {'userId': 123})
```

**cURL**:

```bash
# Port configured in logging-microservice/.env: PORT (default: 3367)
curl -X POST http://logging-microservice:${PORT:-3367}/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "User logged in",
    "service": "user-service",
    "metadata": {"userId": 123}
  }'
```

#### 4. Error Handling

Always implement fallback logging in case the logging microservice is unavailable:

```typescript
async function sendLog(level: string, message: string, service: string, metadata?: any) {
  try {
    // Try to send to logging microservice
    // Port configured in logging-microservice/.env: PORT (default: 3367)
    const response = await fetch('http://logging-microservice:${PORT:-3367}/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, service, metadata }),
    });
    
    if (!response.ok) {
      throw new Error('Logging service returned error');
    }
    
    return await response.json();
  } catch (error) {
    // Fallback: log locally
    console.error(`[${level.toUpperCase()}] [${service}] ${message}`, metadata);
    // Or write to local file
  }
}
```

### E-commerce Integration Example

The e-commerce project uses the centralized logger from `shared/logger/logger.util.ts` which:

- Sends logs to `http://logging-microservice:${PORT:-3367}/api/logs` (internal network, port configured in `logging-microservice/.env`)
- Falls back to local file logging if service is unavailable
- Includes retry logic and error handling

**Environment Variables** (in e-commerce `.env`):

```env
LOGGING_SERVICE_URL=http://logging-microservice:${PORT:-3367}  # PORT configured in logging-microservice/.env
LOG_LEVEL=info
LOG_TIMESTAMP_FORMAT=YYYY-MM-DD HH:mm:ss
```

**Note**: Use the internal Docker network URL (`http://logging-microservice:${PORT:-3367}`, port configured in `logging-microservice/.env`) for services on the same Docker network. For external access, use `https://logging.statex.cz`.

## Production Deployment

### Prerequisites

1. Docker and Docker Compose installed
2. Access to production server (ssh statex)
3. nginx-network Docker network exists (created by nginx-microservice)
4. nginx-microservice running and configured

### Deployment Steps

#### Step 1: Pull Latest Code

```bash
ssh statex
cd /home/statex/logging-microservice
git pull origin master
```

#### Step 2: Configure Environment

Ensure `.env` file exists with production values:

```bash
cd /home/statex/logging-microservice
cat .env  # Verify configuration
# PORT should be set (default: 3367, configured in logging-microservice/.env)
```

#### Step 3: Deploy Service

```bash
cd /home/statex/logging-microservice
./scripts/deploy.sh
```

This will:

- Build Docker image
- Start the service on port ${PORT:-3367} (configured in `logging-microservice/.env`)
- Connect to nginx-network
- Run health checks

#### Step 4: Register with nginx-microservice

The service needs to be registered in nginx-microservice for external access:

1. **Service Registry** (already configured):
   - File: `/home/statex/nginx-microservice/service-registry/logging-microservice.json`
   - Contains service configuration for blue/green deployment

2. **Register Domain** (if not already done):

   ```bash
   ssh statex
   cd /home/statex/nginx-microservice
   # Port configured in logging-microservice/.env: PORT (default: 3367)
   ./scripts/add-domain.sh logging.statex.cz logging-microservice ${PORT:-3367} admin@statex.cz
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
   curl https://logging.statex.cz/health
   ```

#### Step 5: Verify Deployment

```bash
# Check service status
cd /home/statex/logging-microservice
./scripts/status.sh

# Test internal access
# Port configured in logging-microservice/.env: PORT (default: 3367)
docker run --rm --network nginx-network alpine/curl:latest \
  curl -s http://logging-microservice:${PORT:-3367}/health

# Test external access
curl https://logging.statex.cz/health
```

### Access Points

The service is accessible via:

1. **Internal Access** (within Docker network):
   - URL: `http://logging-microservice:${PORT:-3367}` (port configured in `logging-microservice/.env`)
   - Used by other microservices on the same network
   - No SSL required (internal network)

2. **External Access** (via HTTPS):
   - URL: `https://logging.statex.cz`
   - Public internet access
   - SSL certificate managed by nginx-microservice
   - Certificate auto-renewal via Let's Encrypt

### Network Configuration

The service must be on the `nginx-network` Docker network to be accessible by other microservices. The docker-compose.yml automatically connects to this network.

To verify network connection:

```bash
docker network inspect nginx-network | grep logging-microservice
```

### Service Registry

The service is registered in nginx-microservice's service registry for blue/green deployment support:

- **Registry File**: `/home/statex/nginx-microservice/service-registry/logging-microservice.json`
- **State File**: `/home/statex/nginx-microservice/state/logging-microservice.json`

The registry contains:

- Service name and paths
- Container configuration
- Health check endpoints
- Port configuration (${PORT:-3367}, configured in `logging-microservice/.env`)

### Blue/Green Deployment

The service supports blue/green deployment via nginx-microservice:

```bash
cd /home/statex/nginx-microservice
./scripts/blue-green/deploy.sh logging-microservice
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
# Port configured in logging-microservice/.env: PORT (default: 3367)
netstat -tuln | grep ${PORT:-3367}

# Check Docker network
docker network inspect nginx-network
```

### Health Check Failing

```bash
# Test health endpoint manually
# Port configured in logging-microservice/.env: PORT (default: 3367)
docker exec logging-microservice wget -q -O- http://localhost:${PORT:-3367}/health

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
# Verify service is on nginx-network
docker network inspect nginx-network

# Test connectivity from another container
# Port configured in logging-microservice/.env: PORT (default: 3367)
docker run --rm --network nginx-network alpine/curl:latest \
  curl -s http://logging-microservice:${PORT:-3367}/health
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
# Port configured in logging-microservice/.env: PORT (default: 3367)
curl http://localhost:${PORT:-3367}/health

# Send log
# Port configured in logging-microservice/.env: PORT (default: 3367)
curl -X POST http://localhost:${PORT:-3367}/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test log",
    "service": "test-service"
  }'

# Query logs
# Port configured in logging-microservice/.env: PORT (default: 3367)
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

- **Port**: Service runs on port `${PORT:-3367}` (both container and host, configured in `logging-microservice/.env`)
- **Network**: Must be on nginx-network for service discovery
- **Log Storage**: Logs persist in `./logs/` directory (mounted volume on host filesystem)
- **Storage Format**: Dual format - JSON (`{service}.log`) and human-readable (`{service}.human.log`)
- **Database**: No database required (file-based storage)
- **External Access**: Available via `https://logging.statex.cz` (managed by nginx-microservice)
- **Internal Access**: Available via `http://logging-microservice:${PORT:-3367}` (Docker network, port configured in `logging-microservice/.env`)
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
✅ Integration with e-commerce verified
✅ Documentation complete
✅ Deployment scripts ready

## License

Part of the FlipFlop.cz e-commerce platform.
