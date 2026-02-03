# Logging microservice web UI - static files served by nginx
ARG AUTH_SERVICE_URL=https://auth.statex.cz
FROM nginx:alpine AS builder
ARG AUTH_SERVICE_URL
WORKDIR /usr/share/nginx/html
COPY index.html .
COPY admin/ admin/
COPY css/ css/
COPY js/ js/
# Inject AUTH_SERVICE_URL for admin login (auth-microservice URL)
RUN sed 's|__AUTH_SERVICE_URL_VALUE__|'"${AUTH_SERVICE_URL}"'|g' \
    js/config.injected.js.template > js/config.injected.js

FROM nginx:alpine
COPY --from=builder /usr/share/nginx/html /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=2 \
  CMD wget -q -O- http://localhost/health || exit 1
