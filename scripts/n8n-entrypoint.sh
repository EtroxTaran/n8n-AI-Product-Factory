#!/bin/sh
# n8n Auto-Bootstrap Entrypoint Script
#
# This script handles automatic workflow import on first boot of n8n container.
# It ensures workflows are available immediately after fresh deployment.
#
# Features:
# - Waits for PostgreSQL to be ready
# - Imports workflows from mounted /workflows directory
# - Activates all workflows for webhook availability
# - Uses marker file for idempotency (won't re-import on restarts)
#
# Usage:
# Mount this script and workflows directory in docker-compose:
#   volumes:
#     - ./workflows:/workflows:ro
#     - ./scripts/n8n-entrypoint.sh:/n8n-entrypoint.sh:ro
#   entrypoint: ["/bin/sh", "/n8n-entrypoint.sh"]

set -e

# Configuration
MARKER_FILE="/home/node/.n8n/.workflows_imported"
WORKFLOWS_DIR="/workflows"
MAX_RETRIES=30
RETRY_INTERVAL=2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo "${BLUE}[n8n-init]${NC} $1"
}

log_success() {
  echo "${GREEN}[n8n-init]${NC} $1"
}

log_warn() {
  echo "${YELLOW}[n8n-init]${NC} WARNING: $1"
}

log_error() {
  echo "${RED}[n8n-init]${NC} ERROR: $1"
}

# ============================================
# Wait for PostgreSQL
# ============================================
wait_for_postgres() {
  local host="${DB_POSTGRESDB_HOST:-postgres}"
  local port="${DB_POSTGRESDB_PORT:-5432}"
  local retries=0

  log_info "Waiting for PostgreSQL at ${host}:${port}..."

  while [ $retries -lt $MAX_RETRIES ]; do
    if nc -z "$host" "$port" 2>/dev/null; then
      log_success "PostgreSQL is ready!"
      return 0
    fi

    retries=$((retries + 1))
    log_info "PostgreSQL not ready, waiting... (${retries}/${MAX_RETRIES})"
    sleep $RETRY_INTERVAL
  done

  log_error "PostgreSQL did not become ready in time"
  return 1
}

# ============================================
# Import Workflows
# ============================================
import_workflows() {
  log_info "Checking for workflow files in ${WORKFLOWS_DIR}..."

  # Check if workflows directory exists
  if [ ! -d "$WORKFLOWS_DIR" ]; then
    log_warn "Workflows directory not found: ${WORKFLOWS_DIR}"
    log_warn "Use sync-workflows.js or manual import later"
    return 1
  fi

  # Count JSON files (excluding hidden files and Documentation folder)
  workflow_count=$(find "$WORKFLOWS_DIR" -maxdepth 1 -name "*.json" -type f 2>/dev/null | wc -l)

  if [ "$workflow_count" -eq 0 ]; then
    log_warn "No workflow JSON files found in ${WORKFLOWS_DIR}"
    log_warn "Use sync-workflows.js or manual import later"
    return 1
  fi

  log_info "Found ${workflow_count} workflow files"

  # Import all workflows
  log_info "Importing workflows..."
  if n8n import:workflow --separate --input="$WORKFLOWS_DIR/"; then
    log_success "Workflows imported successfully!"
  else
    log_error "Failed to import workflows"
    return 1
  fi

  # Activate all workflows (critical for webhooks to work)
  log_info "Activating all workflows..."
  if n8n update:workflow --all --active=true; then
    log_success "All workflows activated!"
  else
    log_warn "Failed to activate some workflows (may need credential setup)"
  fi

  return 0
}

# ============================================
# Main Entry Point
# ============================================
main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║     n8n Auto-Bootstrap Initialization                    ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""

  # Ensure .n8n directory exists
  mkdir -p /home/node/.n8n

  # Wait for PostgreSQL
  wait_for_postgres || {
    log_error "Cannot proceed without PostgreSQL"
    exit 1
  }

  # Check if workflows have already been imported
  if [ -f "$MARKER_FILE" ]; then
    log_info "Workflows already imported (marker file exists)"
    log_info "To re-import, delete: ${MARKER_FILE}"
  else
    log_info "First boot detected, starting workflow import..."

    if import_workflows; then
      # Create marker file to prevent re-import on restarts
      touch "$MARKER_FILE"
      log_success "Bootstrap complete! Marker file created."
    else
      log_warn "Workflow import had issues - continuing anyway"
      log_warn "You can manually import workflows later"
    fi
  fi

  echo ""
  log_info "Starting n8n server..."
  echo ""

  # Execute n8n start (replaces this process)
  exec n8n start
}

# Run main function
main "$@"
