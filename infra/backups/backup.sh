#!/bin/bash
set -e

# Load environment variables if .env exists
if [ -f .env ]; then
  # Read .env file line by line, ignore comments and empty lines
  export $(grep -v '^#' .env | xargs)
fi

BACKUP_DIR=${BACKUP_DIR:-"infra/backups/dumps"}
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 1. PostgreSQL Backup
echo "Starting PostgreSQL backup..."
PG_BACKUP_FILE="${BACKUP_DIR}/postgres_${TIMESTAMP}.sql"
if [ -n "$DATABASE_URL" ]; then
  pg_dump "$DATABASE_URL" -F c -b -v -f "$PG_BACKUP_FILE"
  echo "PostgreSQL backup completed: $PG_BACKUP_FILE"
else
  echo "Error: DATABASE_URL is not set. Skipping PostgreSQL backup."
fi

# 2. ClickHouse Backup
echo "Starting ClickHouse backup..."
CH_BACKUP_FILE="${BACKUP_DIR}/clickhouse_${TIMESTAMP}.tar.gz"
CH_HOST=${CLICKHOUSE_HOST:-"localhost"}
CH_USER=${CLICKHOUSE_USER:-"default"}
CH_PASSWORD=${CLICKHOUSE_PASSWORD:-""}
CH_DB=${CLICKHOUSE_DATABASE:-"default"}

# Check if clickhouse-client is available
if command -v clickhouse-client &> /dev/null; then
  echo "Using clickhouse-client for backup..."
  CH_PORT=${CLICKHOUSE_PORT:-"9000"}
  clickhouse-client --host "$CH_HOST" --port "$CH_PORT" --user "$CH_USER" --password "$CH_PASSWORD" \
    --query "BACKUP DATABASE $CH_DB TO File('${BACKUP_DIR}/clickhouse_${CH_DB}_${TIMESTAMP}')"
  echo "ClickHouse backup completed."
else
  echo "clickhouse-client not found. Exporting tables via clickhouse HTTP API..."
  CH_HTTP_PORT=${CLICKHOUSE_HTTP_PORT:-"8123"}
  CH_URL="http://${CH_HOST}:${CH_HTTP_PORT}"
  
  TEMP_CH_DIR="infra/backups/temp_ch_${TIMESTAMP}"
  mkdir -p "$TEMP_CH_DIR"
  
  # Fetch all tables from ClickHouse
  TABLES=$(curl -s -u "${CH_USER}:${CH_PASSWORD}" "${CH_URL}/?query=SHOW+TABLES+FROM+${CH_DB}" | tr '\n' ' ')
  
  for table in $TABLES; do
    if [ -n "$table" ]; then
      echo "Exporting table schema: $table"
      curl -s -u "${CH_USER}:${CH_PASSWORD}" "${CH_URL}/?query=SHOW+CREATE+TABLE+${CH_DB}.${table}" > "${TEMP_CH_DIR}/${table}_schema.sql"
      echo "Exporting table data: $table"
      curl -s -u "${CH_USER}:${CH_PASSWORD}" "${CH_URL}/?query=SELECT+*+FROM+${CH_DB}.${table}+FORMAT+TabSeparated" > "${TEMP_CH_DIR}/${table}_data.tsv"
    fi
  done
  
  tar -czf "$CH_BACKUP_FILE" -C "$TEMP_CH_DIR" .
  rm -rf "$TEMP_CH_DIR"
  echo "ClickHouse backup completed: $CH_BACKUP_FILE"
fi

# Cleanup old backups (keep last 7 days)
find "$BACKUP_DIR" -type f -mtime +7 -name "postgres_*" -delete
find "$BACKUP_DIR" -type f -mtime +7 -name "clickhouse_*" -delete

echo "Database backups successfully finished."
