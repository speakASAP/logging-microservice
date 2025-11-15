# Logging Microservice - Production Deployment Guide

## Overview

This guide covers deploying the logging microservice to production on the statex server.

## Prerequisites

1. **Access to Production Server**:

   ```bash
   ssh statex
   ```

2. **Required Infrastructure**:
   - Docker and Docker Compose installed
   - nginx-network Docker network exists (created by nginx-microservice)
   - Sufficient disk space for logs

3. **Project Location**:
   - Production: `/home/statex/logging-microservice` (or as configured)
   - Local: `/Users/sergiystashok/Documents/GitHub/logging-microservice`

## Initial Deployment

### Step 1: Clone/Setup Repository

If the repository doesn't exist on production:

```bash
ssh statex
cd /home/statex
git clone <repository-url> logging-microservice
cd logging-microservice
```

Or if using existing directory:

```bash
ssh statex
cd /home/statex/logging-microservice
git pull origin main
```

### Step 2: Configure Environment

Create `.env` file:

```bash
cd /home/statex/logging-microservice
cp .env.example .env
# Edit .env with production values
nano .env
```

Required environment variables:

```env
# Server Configuration
PORT=3268
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

### Step 3: Verify Network

Ensure nginx-network exists:

```bash
docker network inspect nginx-network
```

If it doesn't exist, start nginx-microservice first:

```bash
cd /home/statex/nginx-microservice
docker compose up -d
```

### Step 4: Deploy

```bash
cd /home/statex/logging-microservice
./scripts/deploy.sh
```

The deployment script will:

- Check for .env file
- Verify nginx-network exists
- Create logs directory
- Build Docker image
- Start the service
- Verify health

### Step 5: Verify Deployment

```bash
# Check status
./scripts/status.sh

# Test health endpoint
curl http://localhost:3268/health

# Test from another container
docker run --rm --network nginx-network alpine/curl:latest \
  curl -s http://logging-microservice:3268/health
```

## Updating the Service

### Method 1: Using Update Script (Recommended)

```bash
ssh statex
cd /home/statex/logging-microservice
./scripts/update.sh
```

### Method 2: Manual Update

```bash
ssh statex
cd /home/statex/logging-microservice

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose build
docker compose up -d

# Verify
./scripts/status.sh
```

## Service Management

### Start Service

```bash
cd /home/statex/logging-microservice
docker compose up -d
```

### Stop Service

```bash
cd /home/statex/logging-microservice
docker compose down
```

### Restart Service

```bash
cd /home/statex/logging-microservice
docker compose restart logging-service
```

### View Logs

```bash
# Service logs
docker compose logs -f logging-service

# Application logs
tail -f logs/application-$(date +%Y-%m-%d).log

# Error logs
tail -f logs/error-$(date +%Y-%m-%d).log
```

### Check Status

```bash
./scripts/status.sh
```

## Integration with E-commerce

The e-commerce services automatically connect to the logging microservice when:

1. **Logging microservice is running** on nginx-network
2. **Environment variable is set** in e-commerce `.env`:

   ```env
   LOGGING_SERVICE_URL=http://logging-microservice:3268
   ```

### Verify Integration

From an e-commerce service container:

```bash
# Test connectivity
docker exec e-commerce-api-gateway curl -s http://logging-microservice:3268/health

# Test log ingestion
docker exec e-commerce-api-gateway curl -X POST http://logging-microservice:3268/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "level": "info",
    "message": "Test from e-commerce",
    "service": "e-commerce-api-gateway"
  }'
```

## Monitoring

### Health Checks

The service includes a health check endpoint:

```bash
curl http://localhost:3268/health
```

Docker also performs automatic health checks (configured in docker-compose.yml).

### Log File Monitoring

Monitor log file sizes:

```bash
du -sh logs/
ls -lh logs/
```

### Disk Space

Monitor disk space for log storage:

```bash
df -h
```

## Troubleshooting

### Service Won't Start

1. **Check logs**:

   ```bash
   docker compose logs logging-service
   ```

2. **Check port availability**:

   ```bash
   netstat -tuln | grep 3268
   ```

3. **Check Docker network**:

   ```bash
   docker network inspect nginx-network
   ```

### Health Check Failing

1. **Test manually**:

   ```bash
   docker exec logging-microservice wget -q -O- http://localhost:3268/health
   ```

2. **Check service logs**:

   ```bash
   docker compose logs logging-service | tail -50
   ```

3. **Restart service**:

   ```bash
   docker compose restart logging-service
   ```

### Logs Not Being Stored

1. **Check directory permissions**:

   ```bash
   ls -la logs/
   ```

2. **Check disk space**:

   ```bash
   df -h
   ```

3. **Check service logs for errors**:

   ```bash
   docker compose logs logging-service | grep -i error
   ```

### Network Connectivity Issues

1. **Verify service is on network**:

   ```bash
   docker network inspect nginx-network | grep logging-microservice
   ```

2. **Test from another container**:

   ```bash
   docker run --rm --network nginx-network alpine/curl:latest \
     curl -s http://logging-microservice:3268/health
   ```

3. **Reconnect to network**:

   ```bash
   docker network connect nginx-network logging-microservice
   ```

## Backup and Maintenance

### Backup Logs

```bash
cd /home/statex/logging-microservice
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
# Copy to backup location
```

### Clean Old Logs

Logs are automatically rotated, but you can manually clean:

```bash
# Remove logs older than 30 days
find logs/ -name "*.log" -mtime +30 -delete
find logs/ -name "*.gz" -mtime +30 -delete
```

### Log Rotation

Log rotation is handled automatically by winston-daily-rotate-file:

- Daily rotation based on date pattern
- Maximum file size: 100MB (configurable)
- Maximum files to keep: 10 (configurable)

Configure in `.env`:

```env
LOG_ROTATION_MAX_SIZE=100m
LOG_ROTATION_MAX_FILES=10
```

## Production Checklist

Before deploying to production:

- [ ] `.env` file configured with production values
- [ ] nginx-network exists and is accessible
- [ ] Sufficient disk space for logs
- [ ] Docker and Docker Compose installed
- [ ] Service tested locally or in staging
- [ ] Health check endpoint working
- [ ] Log ingestion working
- [ ] Log query working
- [ ] Integration with e-commerce verified

## Quick Reference

```bash
# Deploy
./scripts/deploy.sh

# Check status
./scripts/status.sh

# Update
./scripts/update.sh

# View logs
docker compose logs -f logging-service

# Restart
docker compose restart logging-service

# Stop
docker compose down

# Test
./scripts/test.sh
```

## Support

For issues:

1. Check service logs: `docker compose logs logging-service`
2. Check application logs: `tail -f logs/application-*.log`
3. Verify network: `docker network inspect nginx-network`
4. Test health: `curl http://localhost:3268/health`
