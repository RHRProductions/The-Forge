#!/bin/bash

# Complete Restore Script for The Forge
# This script restores the database and images from a backup file

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_ROOT/data/forge.db"
UPLOADS_DIR="$PROJECT_ROOT/public/uploads"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Function to list available backups
list_backups() {
    echo "Available backups:"
    echo ""
    echo "Complete backups (database + images):"
    find "$BACKUP_DIR" -name "forge_backup_*.tar.gz" -type f -printf "%T@ %p\n" 2>/dev/null | sort -rn | awk '{print NR ". " $2}' | while read line; do
        num=$(echo "$line" | cut -d. -f1)
        file=$(echo "$line" | cut -d' ' -f2-)
        size=$(du -h "$file" | cut -f1)
        date=$(stat -c %y "$file" | cut -d. -f1)
        echo "  $num. $file ($size) - $date"
    done

    echo ""
    echo "Database-only backups (legacy):"
    find "$BACKUP_DIR" -name "forge_backup_*.db" -type f -printf "%T@ %p\n" 2>/dev/null | sort -rn | awk '{print NR ". " $2}' | while read line; do
        num=$(echo "$line" | cut -d. -f1)
        file=$(echo "$line" | cut -d' ' -f2-)
        size=$(du -h "$file" | cut -f1)
        date=$(stat -c %y "$file" | cut -d. -f1)
        echo "  $num. $file ($size) - $date"
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
    echo "Example: $0 $BACKUP_DIR/forge_backup_20250101_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    list_backups
    exit 1
fi

# Create safety backup of current database and images
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SAFETY_DIR="$BACKUP_DIR/pre-restore-$TIMESTAMP"
mkdir -p "$SAFETY_DIR"

if [ -f "$DB_PATH" ]; then
    echo "Creating safety backup of current database..."
    cp "$DB_PATH" "$SAFETY_DIR/forge.db"
    echo "✓ Database safety backup created"
fi

if [ -d "$UPLOADS_DIR" ]; then
    echo "Creating safety backup of current images..."
    cp -r "$UPLOADS_DIR" "$SAFETY_DIR/uploads"
    IMAGE_COUNT=$(find "$SAFETY_DIR/uploads" -type f 2>/dev/null | wc -l)
    echo "✓ Images safety backup created ($IMAGE_COUNT files)"
fi

# Detect backup type and restore accordingly
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    # New format: Complete backup with database + images
    echo "Restoring complete backup (database + images) from: $BACKUP_FILE"

    # Create temporary extraction directory
    TEMP_RESTORE_DIR="$BACKUP_DIR/temp_restore_$TIMESTAMP"
    mkdir -p "$TEMP_RESTORE_DIR"

    # Extract backup
    tar -xzf "$BACKUP_FILE" -C "$TEMP_RESTORE_DIR"

    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to extract backup archive"
        rm -rf "$TEMP_RESTORE_DIR"
        exit 1
    fi

    # Restore database
    if [ -f "$TEMP_RESTORE_DIR/forge.db" ]; then
        cp "$TEMP_RESTORE_DIR/forge.db" "$DB_PATH"
        echo "✓ Database restored"
    else
        echo "WARNING: No database found in backup"
    fi

    # Restore images
    if [ -d "$TEMP_RESTORE_DIR/uploads" ]; then
        # Remove current uploads and restore from backup
        rm -rf "$UPLOADS_DIR"
        cp -r "$TEMP_RESTORE_DIR/uploads" "$UPLOADS_DIR"
        IMAGE_COUNT=$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l)
        echo "✓ Images restored ($IMAGE_COUNT files)"
    else
        echo "WARNING: No images found in backup"
    fi

    # Clean up temporary directory
    rm -rf "$TEMP_RESTORE_DIR"

elif [[ "$BACKUP_FILE" == *.db ]]; then
    # Old format: Database-only backup
    echo "Restoring database-only backup from: $BACKUP_FILE"
    echo "WARNING: This is a legacy backup - images are NOT included"

    cp "$BACKUP_FILE" "$DB_PATH"

    if [ $? -ne 0 ]; then
        echo "ERROR: Database restore failed"
        exit 1
    fi

    echo "✓ Database restored"
    echo "NOTE: Images were not restored (legacy backup format)"
else
    echo "ERROR: Unknown backup format: $BACKUP_FILE"
    echo "Supported formats: .tar.gz (complete) or .db (database-only)"
    exit 1
fi

echo ""
echo "✓ Restoration complete!"
echo ""
echo "Safety backup saved at: $SAFETY_DIR"
echo ""
echo "IMPORTANT: Restart the application for changes to take effect"
echo "  pm2 restart the-forge"
