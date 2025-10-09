#!/bin/bash

# Database Restore Script for The Forge
# This script restores the database from a backup file

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_ROOT/data/forge.db"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Function to list available backups
list_backups() {
    echo "Available backups:"
    find "$BACKUP_DIR" -name "forge_backup_*.db" -type f -printf "%T@ %p\n" | sort -rn | awk '{print NR ". " $2}' | while read line; do
        num=$(echo "$line" | cut -d. -f1)
        file=$(echo "$line" | cut -d' ' -f2-)
        size=$(du -h "$file" | cut -f1)
        date=$(stat -c %y "$file" | cut -d. -f1)
        echo "$num. $file ($size) - $date"
    done
}

# Check if backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# If no argument provided, list backups and prompt
if [ $# -eq 0 ]; then
    list_backups
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 $BACKUP_DIR/forge_backup_20250101_120000.db"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    list_backups
    exit 1
fi

# Create safety backup of current database
if [ -f "$DB_PATH" ]; then
    SAFETY_BACKUP="$DB_PATH.pre-restore-$(date +%Y%m%d_%H%M%S).backup"
    echo "Creating safety backup of current database..."
    cp "$DB_PATH" "$SAFETY_BACKUP"
    echo "✓ Safety backup created: $SAFETY_BACKUP"
fi

# Restore the backup
echo "Restoring database from: $BACKUP_FILE"
cp "$BACKUP_FILE" "$DB_PATH"

if [ $? -eq 0 ]; then
    echo "✓ Database restored successfully"
    echo ""
    echo "IMPORTANT: Restart the application for changes to take effect"
    echo "  pm2 restart the-forge"
    exit 0
else
    echo "ERROR: Restore failed"
    if [ -f "$SAFETY_BACKUP" ]; then
        echo "Restoring from safety backup..."
        cp "$SAFETY_BACKUP" "$DB_PATH"
        echo "Database reverted to pre-restore state"
    fi
    exit 1
fi
