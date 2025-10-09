#!/bin/bash

# Database Backup Script for The Forge
# This script creates timestamped backups of the SQLite database
# and maintains a retention policy of 7 days

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_ROOT/data/forge.db"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/forge_backup_$TIMESTAMP.db"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database not found at $DB_PATH"
    exit 1
fi

# Create backup using SQLite's .backup command
# This ensures a consistent backup even if the database is being used
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully: $BACKUP_FILE"

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "  Size: $BACKUP_SIZE"

    # Clean up old backups (keep last 7 days)
    echo "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "forge_backup_*.db" -type f -mtime +$RETENTION_DAYS -delete

    # Count remaining backups
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "forge_backup_*.db" -type f | wc -l)
    echo "Total backups: $BACKUP_COUNT"

    exit 0
else
    echo "ERROR: Backup failed"
    exit 1
fi
