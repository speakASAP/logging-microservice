# Production Deployment

## Task: Deploy logging-microservice on production

## Quick Deployment

```bash
# 1. Pull latest code
ssh statex "cd /home/statex/logging-microservice && git pull origin master"

# 2. Deploy service
ssh statex "cd /home/statex/logging-microservice && ./scripts/deploy.sh"

# 3. Register domain (if not exists)
ssh statex "cd /home/statex/nginx-microservice && ./scripts/add-domain.sh logging.statex.cz logging-microservice 3367 admin@statex.cz"

# 4. Fix nginx proxy_pass if needed
ssh statex "sed -i 's|proxy_pass \$backend_api/api/;|proxy_pass \$backend_api;|' /home/statex/nginx-microservice/nginx/conf.d/logging.statex.cz.conf"

# 5. Copy certificate if add-domain failed
ssh statex "cd /home/statex/nginx-microservice && mkdir -p certificates/logging.statex.cz && docker exec nginx-certbot cat /etc/letsencrypt/live/logging.statex.cz/fullchain.pem > certificates/logging.statex.cz/fullchain.pem && docker exec nginx-certbot cat /etc/letsencrypt/live/logging.statex.cz/privkey.pem > certificates/logging.statex.cz/privkey.pem && chmod 600 certificates/logging.statex.cz/privkey.pem"

# 6. Reload nginx
ssh statex "docker exec nginx-microservice nginx -t && docker exec nginx-microservice nginx -s reload"

# 7. Verify deployment
ssh statex "curl -s https://logging.statex.cz/health && docker run --rm --network nginx-network alpine/curl:latest curl -s http://logging-microservice:3367/health"
```

## Success Criteria

- Service accessible: `https://logging.statex.cz/health` returns success
- Internal access: `http://logging-microservice:3367/health` returns success
- No errors in logs: `docker compose logs logging-service | grep -i error`

## Notes

- Port: 3367
- Internal URL: `http://logging-microservice:3367`
- External URL: `https://logging.statex.cz`
- Service registry: `/home/statex/nginx-microservice/service-registry/logging-microservice.json`
- Environment: `.env` file in project root (PORT=3367)
