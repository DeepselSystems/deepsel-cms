FROM python:3.12-alpine

WORKDIR /usr/src/app

# Install the PostgreSQL client
RUN apk update && apk add --no-cache \
    nodejs \
    npm \
    postgresql-client

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

RUN npm install --omit=dev

COPY crontab /tmp/crontab
RUN cat /tmp/crontab > /etc/crontabs/root

EXPOSE 8000

CMD [ "sh", "./entrypoint.sh" ]
