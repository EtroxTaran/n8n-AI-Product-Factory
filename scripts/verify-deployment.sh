#!/bin/bash
# AI Product Factory - Post-Deployment Verification Script
#
# Verifies that all services are healthy and workflows are properly imported
# after a fresh deployment.
#
# Usage:
#   ./scripts/verify-deployment.sh
#
# Required Environment Variables:
#   N8N_API_URL     - n8n instance URL (e.g., https://n8n.example.com)
#   N8N_API_KEY     - n8n API key for authentication
#   DASHBOARD_URL   - Dashboard URL (e.g., https://dashboard.example.com)
#
# Optional:
#   VERBOSE         - Set to "true" for detailed output
#   SKIP_WEBHOOKS   - Set to "true" to skip webhook tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

# ============================================
# Helper Functions
# ============================================

print_header() {
  echo ""
  echo -e "${BOLD}${CYAN}$1${NC}"
  echo "────────────────────────────────────────────────────────────"
}

check_pass() {
  echo -e "  ${GREEN}✅${NC} $1"
  CHECKS_PASSED=$((CHECKS_PASSED + 1))
}

check_fail() {
  echo -e "  ${RED}❌${NC} $1"
  CHECKS_FAILED=$((CHECKS_FAILED + 1))
}

check_warn() {
  echo -e "  ${YELLOW}⚠️${NC} $1"
  CHECKS_WARNED=$((CHECKS_WARNED + 1))
}

verbose() {
  if [ "$VERBOSE" = "true" ]; then
    echo -e "     ${BLUE}[verbose]${NC} $1"
  fi
}

# ============================================
# Validation
# ============================================

validate_env() {
  local missing=0

  if [ -z "$N8N_API_URL" ]; then
    echo -e "${RED}Error: N8N_API_URL is required${NC}"
    missing=1
  fi

  if [ -z "$N8N_API_KEY" ]; then
    echo -e "${RED}Error: N8N_API_KEY is required${NC}"
    missing=1
  fi

  if [ -z "$DASHBOARD_URL" ]; then
    echo -e "${RED}Error: DASHBOARD_URL is required${NC}"
    missing=1
  fi

  if [ $missing -eq 1 ]; then
    echo ""
    echo "Usage: N8N_API_URL=... N8N_API_KEY=... DASHBOARD_URL=... ./verify-deployment.sh"
    exit 1
  fi
}

# ============================================
# Health Checks
# ============================================

check_n8n_health() {
  print_header "n8n Health Check"

  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" "$N8N_API_URL/healthz" --max-time 10 2>/dev/null || echo "000")

  if [ "$response" = "200" ]; then
    check_pass "n8n is healthy (HTTP $response)"
  else
    check_fail "n8n health check failed (HTTP $response)"
  fi
}

check_dashboard_health() {
  print_header "Dashboard Health Check"

  local response
  response=$(curl -s -o /dev/null -w "%{http_code}" "$DASHBOARD_URL/api/health" --max-time 10 2>/dev/null || echo "000")

  if [ "$response" = "200" ]; then
    check_pass "Dashboard is healthy (HTTP $response)"
  else
    check_fail "Dashboard health check failed (HTTP $response)"
  fi

  # Check database connectivity (if verbose)
  if [ "$VERBOSE" = "true" ]; then
    local health_body
    health_body=$(curl -s "$DASHBOARD_URL/api/health" --max-time 10 2>/dev/null || echo "{}")
    verbose "Health response: $health_body"
  fi
}

# ============================================
# Workflow Checks
# ============================================

check_workflows() {
  print_header "Workflow Verification"

  # Fetch all workflows
  local workflows_response
  workflows_response=$(curl -s "$N8N_API_URL/api/v1/workflows" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    --max-time 15 2>/dev/null || echo '{"data":[]}')

  # Count workflows
  local workflow_count
  workflow_count=$(echo "$workflows_response" | grep -o '"id"' | wc -l)

  verbose "Raw response length: ${#workflows_response} bytes"

  if [ "$workflow_count" -ge 5 ]; then
    check_pass "Found $workflow_count workflows (expected >= 5)"
  elif [ "$workflow_count" -gt 0 ]; then
    check_warn "Only $workflow_count workflows found (expected >= 5)"
  else
    check_fail "No workflows found - import may have failed"
  fi

  # Check for critical workflows
  check_critical_workflow "$workflows_response" "AI Product Factory - API"
  check_critical_workflow "$workflows_response" "AI Product Factory - Main Orchestrator"
  check_critical_workflow "$workflows_response" "AI Product Factory - S3 Subworkflow"
}

check_critical_workflow() {
  local response="$1"
  local workflow_name="$2"

  if echo "$response" | grep -q "\"name\":\"$workflow_name\""; then
    # Check if active
    if echo "$response" | grep -A 10 "\"name\":\"$workflow_name\"" | grep -q '"active":true'; then
      check_pass "$workflow_name (active)"
    else
      check_warn "$workflow_name (imported but inactive)"
    fi
  else
    check_fail "$workflow_name (not found)"
  fi
}

# ============================================
# Webhook Tests
# ============================================

check_webhooks() {
  if [ "$SKIP_WEBHOOKS" = "true" ]; then
    print_header "Webhook Tests (skipped)"
    echo "  Set SKIP_WEBHOOKS=false to enable"
    return
  fi

  print_header "Webhook Endpoint Tests"

  # Test project-status webhook (should exist even without running)
  local webhook_response
  webhook_response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$N8N_API_URL/webhook/project-status" \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    --max-time 10 2>/dev/null || echo "000")

  # Any response other than connection failure means webhook exists
  if [ "$webhook_response" = "000" ]; then
    check_fail "Cannot reach webhook endpoint"
  elif [ "$webhook_response" = "404" ]; then
    check_warn "project-status webhook not found (workflow may be inactive)"
  else
    check_pass "project-status webhook reachable (HTTP $webhook_response)"
  fi

  # Test start-project webhook
  webhook_response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$N8N_API_URL/webhook/start-project" \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    --max-time 10 2>/dev/null || echo "000")

  if [ "$webhook_response" = "000" ]; then
    check_fail "Cannot reach start-project webhook"
  elif [ "$webhook_response" = "404" ]; then
    check_warn "start-project webhook not found (workflow may be inactive)"
  else
    check_pass "start-project webhook reachable (HTTP $webhook_response)"
  fi
}

# ============================================
# Infrastructure Checks (Optional)
# ============================================

check_infrastructure() {
  print_header "Infrastructure Status"

  # Check if S3 endpoint is accessible (if S3_ENDPOINT is set)
  if [ -n "$S3_ENDPOINT" ]; then
    local s3_response
    s3_response=$(curl -s -o /dev/null -w "%{http_code}" "$S3_ENDPOINT" --max-time 5 2>/dev/null || echo "000")
    if [ "$s3_response" != "000" ]; then
      check_pass "S3/SeaweedFS reachable (HTTP $s3_response)"
    else
      check_warn "S3/SeaweedFS not reachable"
    fi
  else
    verbose "S3_ENDPOINT not set, skipping S3 check"
  fi

  # Check if Qdrant is accessible (if QDRANT_URL is set)
  if [ -n "$QDRANT_URL" ]; then
    local qdrant_response
    qdrant_response=$(curl -s -o /dev/null -w "%{http_code}" "$QDRANT_URL/collections" --max-time 5 2>/dev/null || echo "000")
    if [ "$qdrant_response" != "000" ]; then
      check_pass "Qdrant reachable (HTTP $qdrant_response)"
    else
      check_warn "Qdrant not reachable"
    fi
  else
    verbose "QDRANT_URL not set, skipping Qdrant check"
  fi

  # Check if Graphiti is accessible (if GRAPHITI_URL is set)
  if [ -n "$GRAPHITI_URL" ]; then
    local graphiti_response
    graphiti_response=$(curl -s -o /dev/null -w "%{http_code}" "$GRAPHITI_URL/health" --max-time 5 2>/dev/null || echo "000")
    if [ "$graphiti_response" != "000" ]; then
      check_pass "Graphiti reachable (HTTP $graphiti_response)"
    else
      check_warn "Graphiti not reachable"
    fi
  else
    verbose "GRAPHITI_URL not set, skipping Graphiti check"
  fi
}

# ============================================
# Summary
# ============================================

print_summary() {
  echo ""
  echo "═══════════════════════════════════════════════════════════"
  echo -e "${BOLD}                    Verification Summary${NC}"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  echo -e "  ${GREEN}Passed:${NC}   $CHECKS_PASSED"
  echo -e "  ${RED}Failed:${NC}   $CHECKS_FAILED"
  echo -e "  ${YELLOW}Warnings:${NC} $CHECKS_WARNED"
  echo ""

  if [ $CHECKS_FAILED -eq 0 ]; then
    if [ $CHECKS_WARNED -eq 0 ]; then
      echo -e "  ${GREEN}${BOLD}All checks passed!${NC}"
    else
      echo -e "  ${YELLOW}${BOLD}All critical checks passed with warnings.${NC}"
    fi
    echo ""
    return 0
  else
    echo -e "  ${RED}${BOLD}Some checks failed. Review the issues above.${NC}"
    echo ""
    echo "  Common fixes:"
    echo "    - Ensure all services are running: docker compose ps"
    echo "    - Check n8n logs: docker compose logs n8n"
    echo "    - Verify credentials are configured in n8n UI"
    echo "    - Run sync-workflows.js manually if import failed"
    echo ""
    return 1
  fi
}

# ============================================
# Main
# ============================================

main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║    AI Product Factory - Post-Deployment Verification     ║"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""
  echo "  N8N_API_URL:   $N8N_API_URL"
  echo "  DASHBOARD_URL: $DASHBOARD_URL"
  echo ""

  validate_env

  check_n8n_health
  check_dashboard_health
  check_workflows
  check_webhooks
  check_infrastructure

  print_summary
}

main "$@"
