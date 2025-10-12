#!/bin/bash

# Sync production database to local development
echo "📥 Downloading production database..."

scp root@143.244.185.41:/var/www/the-forge/data/forge.db ./data/forge.db

if [ $? -eq 0 ]; then
    echo "✅ Production data synced successfully!"
    echo "🔄 Restart your dev server to see the changes"
else
    echo "❌ Failed to sync production data"
    exit 1
fi
