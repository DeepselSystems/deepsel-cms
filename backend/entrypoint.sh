#!/bin/bash

# Function to check if PostgreSQL is ready
wait_for_postgres() {
    until PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c '\q'; do
        echo "Waiting for PostgreSQL..."
        sleep 2
    done
    echo "PostgreSQL is up. Proceeding..."
}

# Call the function to wait for PostgreSQL
wait_for_postgres

# Start the cron daemon
echo "Starting cron daemon..."
crond -f -l 2 &

# Start the FastAPI server
echo "Starting server..."
uvicorn main:app --host 0.0.0.0 --port 8000 --log-config log_config.yml