#!/bin/bash
# ============================================
# AI Product Factory - Dashboard Database Initialization
# ============================================
# This script runs all dashboard-related SQL schemas against the
# 'dashboard' database (not the default 'n8n' database).
#
# The SQL files in sql-templates/ are NOT auto-executed by PostgreSQL
# because they're in a subdirectory. This script runs them manually
# against the correct database.
# ============================================

set -e

TEMPLATES_DIR="/docker-entrypoint-initdb.d/sql-templates"

echo "[init-dashboard] Initializing dashboard database with all schemas..."

# Run the project-state schema
echo "[init-dashboard] Creating project_state tables..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "dashboard" -f "$TEMPLATES_DIR/01-project-state.sql"

# Run the add-input-files migration (adds columns if not exists)
echo "[init-dashboard] Running add-input-files migration..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "dashboard" -f "$TEMPLATES_DIR/02-add-input-files.sql"

# Run the app-settings schema (for setup wizard)
echo "[init-dashboard] Creating app_settings and workflow_registry tables..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "dashboard" -f "$TEMPLATES_DIR/03-app-settings.sql"

echo "[init-dashboard] Dashboard database initialization complete!"
echo "[init-dashboard] Tables created in 'dashboard' database:"
psql --username "$POSTGRES_USER" --dbname "dashboard" -c "\dt"
