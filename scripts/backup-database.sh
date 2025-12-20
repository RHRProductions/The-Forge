#!/bin/bash
set -e

# Database backup script for The Forge CRM
# Run daily via cron: 0 2 * * * /var/www/the-forge/scripts/backup-database.sh

BACKUP_DIR="/var/backups/the-forge"
DB_PATH="/var/www/the-forge/data/forge.db"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/forge-backup-$TIMESTAMP.db"
KEEP_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Checkpoint the WAL file to ensure clean backup
sqlite3 "$DB_PATH" 'PRAGMA wal_checkpoint(TRUNCATE);'

# Copy database file
cp "$DB_PATH" "$BACKUP_FILE"

# Compress backup
gzip "$BACKUP_FILE"

# Delete backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "forge-backup-*.db.gz" -mtime +$KEEP_DAYS -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
