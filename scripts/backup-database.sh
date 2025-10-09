#!/bin/bash

# Complete Backup Script for The Forge
# This script creates timestamped backups of the SQLite database AND uploaded images
# and maintains a retention policy of 7 days

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_ROOT/data/forge.db"
UPLOADS_DIR="$PROJECT_ROOT/public/uploads"
BACKUP_DIR="$PROJECT_ROOT/backups"
RETENTION_DAYS=7

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEMP_BACKUP_DIR="$BACKUP_DIR/temp_$TIMESTAMP"
BACKUP_ARCHIVE="$BACKUP_DIR/forge_backup_$TIMESTAMP.tar.gz"

# Create temporary directory for staging backup
mkdir -p "$TEMP_BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "ERROR: Database not found at $DB_PATH"
    rm -rf "$TEMP_BACKUP_DIR"
    exit 1
fi

# Create database backup using SQLite's .backup command
echo "Backing up database..."
sqlite3 "$DB_PATH" ".backup '$TEMP_BACKUP_DIR/forge.db'"

if [ $? -ne 0 ]; then
    echo "ERROR: Database backup failed"
    rm -rf "$TEMP_BACKUP_DIR"
    exit 1
fi

# Backup uploaded images if directory exists
if [ -d "$UPLOADS_DIR" ]; then
    echo "Backing up uploaded images..."
    cp -r "$UPLOADS_DIR" "$TEMP_BACKUP_DIR/uploads"
    IMAGE_COUNT=$(find "$TEMP_BACKUP_DIR/uploads" -type f 2>/dev/null | wc -l)
    echo "  Images backed up: $IMAGE_COUNT"
else
    echo "  No uploads directory found, skipping images"
    mkdir -p "$TEMP_BACKUP_DIR/uploads/.gitkeep"
fi

# Create compressed archive of database + images
echo "Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "forge_backup_$TIMESTAMP.tar.gz" -C "$TEMP_BACKUP_DIR" .

# Check if archive was created successfully
if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully: $BACKUP_ARCHIVE"

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_ARCHIVE" | cut -f1)
    echo "  Size: $BACKUP_SIZE"

    # Clean up temporary directory
    rm -rf "$TEMP_BACKUP_DIR"

    # Clean up old backups (keep last 7 days)
    echo "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "forge_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "forge_backup_*.db" -type f -mtime +$RETENTION_DAYS -delete

    # Count remaining backups
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "forge_backup_*.tar.gz" -type f | wc -l)
    echo "Total backups: $BACKUP_COUNT"

    exit 0
else
    echo "ERROR: Backup archive creation failed"
    rm -rf "$TEMP_BACKUP_DIR"
    exit 1
fi
