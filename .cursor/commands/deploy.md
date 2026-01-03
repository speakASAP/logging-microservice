# Production Deployment

## Task: Deploy logging-microservice on production

## Quick Deployment

```bash
# Load environment variables from .env
source .env
SERVICE_NAME=${SERVICE_NAME:-logging-microservice}
DOMAIN=${DOMAIN:-logging.example.com}
PORT=${PORT:-3367}
PROJECT_BASE_PATH=${PROJECT_BASE_PATH:-/home/user}
SSH_HOST=${SSH_HOST:-user@server}
NGINX_NETWORK_NAME=${NGINX_NETWORK_NAME:-nginx-network}

# 1. Pull latest code
ssh ${SSH_HOST} "cd ${PROJECT_BASE_PATH}/logging-microservice && git pull origin master"

# 2. Deploy service
ssh ${SSH_HOST} "cd ${PROJECT_BASE_PATH}/logging-microservice && ./scripts/deploy.sh"

# 3. Register domain (if not exists)
ssh ${SSH_HOST} "cd ${PROJECT_BASE_PATH}/nginx-microservice && ./scripts/add-domain.sh ${DOMAIN} ${SERVICE_NAME} ${PORT} admin@${DOMAIN#*.}"

# 4. Fix nginx proxy_pass if needed
ssh ${SSH_HOST} "sed -i 's|proxy_pass \$backend_api/api/;|proxy_pass \$backend_api;|' ${PROJECT_BASE_PATH}/nginx-microservice/nginx/conf.d/${DOMAIN}.conf"

# 5. Copy certificate if add-domain failed
ssh ${SSH_HOST} "cd ${PROJECT_BASE_PATH}/nginx-microservice && mkdir -p certificates/${DOMAIN} && docker exec nginx-certbot cat /etc/letsencrypt/live/${DOMAIN}/fullchain.pem > certificates/${DOMAIN}/fullchain.pem && docker exec nginx-certbot cat /etc/letsencrypt/live/${DOMAIN}/privkey.pem > certificates/${DOMAIN}/privkey.pem && chmod 600 certificates/${DOMAIN}/privkey.pem"

# 6. Reload nginx
ssh ${SSH_HOST} "docker exec nginx-microservice nginx -t && docker exec nginx-microservice nginx -s reload"

# 7. Verify deployment
ssh ${SSH_HOST} "curl -s https://${DOMAIN}/health && docker run --rm --network ${NGINX_NETWORK_NAME} alpine/curl:latest curl -s http://${SERVICE_NAME}:${PORT}/health"
```

## Success Criteria

- Service accessible: `https://${DOMAIN}/health` returns success
- Internal access: `http://${SERVICE_NAME}:${PORT}/health` returns success
- No errors in logs: `docker compose logs logging-service | grep -i error`

## Notes

- Port: ${PORT:-3367} (configured in `.env`)
- Internal URL: `http://${SERVICE_NAME:-logging-microservice}:${PORT:-3367}`
- External URL: `https://${DOMAIN}`
- Service registry: `${PROJECT_BASE_PATH:-/home/user}/nginx-microservice/service-registry/${SERVICE_NAME:-logging-microservice}.json`
- Environment: `.env` file in project root (SERVICE_NAME, DOMAIN, PORT, etc.)
