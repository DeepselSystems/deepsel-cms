FROM python:3.12-alpine

WORKDIR /usr/src/app

RUN apk update && apk add --no-cache \
    nodejs \
    npm \
    postgresql-client \
    nginx \
    lsof

# Copy and install Python deps (layer cache)
COPY backend/ ./backend/
RUN pip install --no-cache-dir ./backend

# Copy the rest (client, themes, packages, root package.json, etc.)
COPY . .

# Nginx config
COPY nginx.conf /etc/nginx/http.d/default.conf

# Crontab
RUN cat backend/crontab > /etc/crontabs/root

WORKDIR /usr/src/app/backend

EXPOSE 80

CMD ["sh", "./entrypoint.sh"]
