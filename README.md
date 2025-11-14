# Logging Microservice

Centralized logging service for the FlipFlop.cz e-commerce platform. Collects, stores, and provides querying capabilities for logs from all microservices.

## Features

- ✅ **Log Ingestion** - Receive logs from all services via HTTP API
- ✅ **Log Storage** - File-based storage with daily rotation
- ✅ **Log Querying** - Query logs by service, level, date range
- ✅ **Service Tracking** - Track logs per service
- ✅ **Daily Rotation** - Automatic log file rotation
- ✅ **Error Logging** - Separate error log files
- ✅ **Health Checks** - Built-in health endpoint
- ✅ **Production Ready** - Docker containerized with health checks

## Technology Stack

- **Framework**: NestJS (TypeScript)
- **Logging**: Winston
- **File Rotation**: winston-daily-rotate-file
- **Container**: Docker

## API Endpoints

### Ingest Log
```
POST /api/logs
```

**Request Body**:
```json
{
  "level": "error|warn|info|debug",
  "message": "Log message",
  "service": "service-name",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "metadata": {
    "key": "value"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Log ingested successfully"
}
```

### Query Logs
```
GET /api/logs/query?service=user-service&level=error&startDate=2024-01-01&endDate=2024-01-31&limit=100
```

**Query Parameters**:
- `service` (optional): Filter by service name
- `level` (optional): Filter by log level (error, warn, info, debug)
- `startDate` (optional): Start date for filtering (ISO format)
- `endDate` (optional): End date for filtering (ISO format)
- `limit` (optional): Maximum number of logs to return (default: 100)

**Response**:
```json
{
  "success": true,
  "data": [...],
  "count": 10
}
```

### Get Services
```
GET /api/logs/services
```

**Response**:
```json
{
  "success": true,
  "data": ["user-service", "product-service", "order-service"],
  "count": 3
}
```

### Health Check
```
GET /health
```

**Response**:
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
PORT=3009
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
```
logs/
  ├── application-YYYY-MM-DD.log  # All logs (rotated daily)
  ├── error-YYYY-MM-DD.log         # Error logs only (rotated daily)
  └── service-name.log              # Service-specific logs
```

Log files are automatically rotated:
- Daily rotation based on date pattern
- Maximum file size: 100MB (configurable)
- Maximum files to keep: 10 (configurable)

## Integration

This service is used by all microservices in the platform. Services send logs via HTTP POST to `/api/logs`. The logger utility in the e-commerce project automatically sends logs to this service.

### E-commerce Integration

The e-commerce project uses the centralized logger from `shared/logger/logger.util.ts` which:
- Sends logs to `http://logging-microservice:3009/api/logs`
- Falls back to local file logging if service is unavailable
- Includes retry logic and error handling

### Environment Variable in E-commerce

Set in e-commerce `.env`:
```env
LOGGING_SERVICE_URL=http://logging-microservice:3009
LOG_LEVEL=info
LOG_TIMESTAMP_FORMAT=YYYY-MM-DD HH:mm:ss
```

## Production Deployment

### Prerequisites

1. Docker and Docker Compose installed
2. Access to production server (ssh statex)
3. nginx-network Docker network exists (created by nginx-microservice)

### Deployment Steps

1. **SSH to production server**:
   ```bash
   ssh statex
   ```

2. **Navigate to logging-microservice directory**:
   ```bash
   cd /home/statex/logging-microservice
   # Or if in separate location:
   cd /path/to/logging-microservice
   ```

3. **Create .env file** (if not exists):
   ```bash
   cp .env.example .env
   # Edit .env with production values
   ```

4. **Deploy**:
   ```bash
   ./scripts/deploy.sh
   ```

5. **Verify**:
   ```bash
   ./scripts/status.sh
   ```

### Network Configuration

The service must be on the `nginx-network` Docker network to be accessible by other microservices. The docker-compose.yml automatically connects to this network.

To verify network connection:
```bash
docker network inspect nginx-network | grep logging-microservice
```

## Troubleshooting

### Service Not Starting

```bash
# Check logs
docker compose logs logging-service

# Check if port is in use
netstat -tuln | grep 3009

# Check Docker network
docker network inspect nginx-network
```

### Health Check Failing

```bash
# Test health endpoint manually
docker exec logging-microservice wget -q -O- http://localhost:3009/health

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
docker run --rm --network nginx-network alpine/curl:latest \
  curl -s http://logging-microservice:3009/health
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

## Development

### Project Structure

```
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
│   └── update.sh
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

```bash
# Run tests
npm test

# Test API locally
curl -X POST http://localhost:3009/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test log",
    "service": "test-service"
  }'
```

## License

Part of the FlipFlop.cz e-commerce platform.
