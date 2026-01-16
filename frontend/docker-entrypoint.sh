#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AI Product Factory - Dashboard Startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for database to be ready (with timeout)
echo "⏳ Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # Use the migration script to test connectivity (it handles connection testing)
    if node scripts/db-migrate.mjs 2>/dev/null; then
        echo ""
        echo "🚀 Starting application..."
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exec node .output/server/index.mjs
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "❌ Database not ready after ${MAX_RETRIES} attempts"
        exit 1
    fi

    echo "   Retry $RETRY_COUNT/$MAX_RETRIES - waiting 2s..."
    sleep 2
done
