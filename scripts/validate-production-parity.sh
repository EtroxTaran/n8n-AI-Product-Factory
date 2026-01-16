#!/bin/bash
# =============================================================================
# AI Product Factory - Production Parity Validation Script
# =============================================================================
# This script validates that the local production-parity environment
# (docker-compose.local-prod.yml) matches the Dokploy production configuration.
#
# Usage:
#   ./scripts/validate-production-parity.sh [--skip-build] [--keep-running]
#
# Options:
#   --skip-build    Skip building the frontend image (use existing)
#   --keep-running  Don't stop services after validation (for debugging)
#
# Exit codes:
#   0 - All validations passed
#   1 - One or more validations failed
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.local-prod.yml"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Parse arguments
SKIP_BUILD=false
KEEP_RUNNING=false
for arg in "$@"; do
    case $arg in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --keep-running)
            KEEP_RUNNING=true
            shift
            ;;
    esac
done

# Track validation results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
declare -a FAILED_SERVICES=()

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${BOLD}$1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
}

print_subheader() {
    echo ""
    echo -e "${CYAN}─── $1 ───${NC}"
}

check_pass() {
    ((TOTAL_CHECKS++))
    ((PASSED_CHECKS++))
    echo -e "  ${GREEN}✓${NC} $1"
}

check_fail() {
    ((TOTAL_CHECKS++))
    ((FAILED_CHECKS++))
    FAILED_SERVICES+=("$1")
    echo -e "  ${RED}✗${NC} $1: $2"
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

wait_for_service() {
    local service_name=$1
    local check_cmd=$2
    local max_attempts=$3
    local interval=$4

    echo -n "  Waiting for $service_name: "
    for i in $(seq 1 $max_attempts); do
        if eval "$check_cmd" > /dev/null 2>&1; then
            echo -e "${GREEN}Ready${NC} (${i}/${max_attempts})"
            return 0
        fi
        echo -n "."
        sleep $interval
    done
    echo -e "${RED}Timeout${NC}"
    return 1
}

# Cleanup function
cleanup() {
    if [ "$KEEP_RUNNING" = false ]; then
        echo ""
        echo -e "${YELLOW}Cleaning up...${NC}"
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
    else
        echo ""
        echo -e "${YELLOW}Services kept running (--keep-running flag)${NC}"
        echo -e "  Stop with: docker compose -f $COMPOSE_FILE down -v"
    fi
}

# =============================================================================
# Main Script
# =============================================================================

print_header "AI Product Factory - Production Parity Validation"

echo ""
echo -e "  Compose file: ${CYAN}$COMPOSE_FILE${NC}"
echo -e "  Project root: ${CYAN}$PROJECT_ROOT${NC}"
echo -e "  Skip build:   ${CYAN}$SKIP_BUILD${NC}"
echo -e "  Keep running: ${CYAN}$KEEP_RUNNING${NC}"

# Trap for cleanup on exit
trap cleanup EXIT

# =============================================================================
# Step 1: Prerequisites Check
# =============================================================================

print_subheader "Step 1: Checking Prerequisites"

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    check_pass "Docker installed (v$DOCKER_VERSION)"
else
    check_fail "Docker" "Not installed"
    exit 1
fi

# Check Docker Compose
if docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version --short 2>/dev/null || echo "unknown")
    check_pass "Docker Compose installed (v$COMPOSE_VERSION)"
else
    check_fail "Docker Compose" "Not installed"
    exit 1
fi

# Check compose file exists
if [ -f "$COMPOSE_FILE" ]; then
    check_pass "Compose file exists"
else
    check_fail "Compose file" "Not found at $COMPOSE_FILE"
    exit 1
fi

# Check init-scripts directory
if [ -d "init-scripts" ]; then
    check_pass "init-scripts directory exists"
else
    check_warn "init-scripts directory not found (database may not initialize)"
fi

# Check frontend directory
if [ -d "frontend" ] && [ -f "frontend/Dockerfile" ]; then
    check_pass "Frontend directory and Dockerfile exist"
else
    check_warn "Frontend not found - dashboard service will fail to build"
fi

# =============================================================================
# Step 2: Stop Existing Services
# =============================================================================

print_subheader "Step 2: Cleaning Up Existing Services"

docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
check_pass "Stopped any existing services"

# =============================================================================
# Step 3: Start Services
# =============================================================================

print_subheader "Step 3: Starting Services"

if [ "$SKIP_BUILD" = true ]; then
    echo -e "  ${YELLOW}Skipping frontend build (--skip-build)${NC}"
    # Start without building
    docker compose -f "$COMPOSE_FILE" up -d --no-build 2>&1 || {
        check_fail "Service startup" "Failed to start services"
        exit 1
    }
else
    # Build and start
    docker compose -f "$COMPOSE_FILE" up -d --build 2>&1 || {
        check_fail "Service startup" "Failed to build/start services"
        exit 1
    }
fi

check_pass "Services started"

# =============================================================================
# Step 4: Wait for Health Checks
# =============================================================================

print_subheader "Step 4: Waiting for Services to be Healthy"

# PostgreSQL (fast startup)
if wait_for_service "PostgreSQL" \
    "docker compose -f $COMPOSE_FILE exec -T postgres pg_isready -U n8n -d n8n" \
    30 2; then
    check_pass "PostgreSQL is ready"
else
    check_fail "PostgreSQL" "Failed to become ready"
fi

# Redis (fast startup)
if wait_for_service "Redis" \
    "docker compose -f $COMPOSE_FILE exec -T redis redis-cli ping" \
    20 2; then
    check_pass "Redis is ready"
else
    check_fail "Redis" "Failed to become ready"
fi

# Qdrant
if wait_for_service "Qdrant" \
    "curl -sf http://localhost:6333/readyz 2>/dev/null || docker compose -f $COMPOSE_FILE exec -T qdrant bash -c '(echo > /dev/tcp/localhost/6333)'" \
    30 2; then
    check_pass "Qdrant is ready"
else
    check_fail "Qdrant" "Failed to become ready"
fi

# FalkorDB
if wait_for_service "FalkorDB" \
    "docker compose -f $COMPOSE_FILE exec -T falkordb redis-cli ping" \
    20 2; then
    check_pass "FalkorDB is ready"
else
    check_fail "FalkorDB" "Failed to become ready"
fi

# SeaweedFS (needs master port check)
if wait_for_service "SeaweedFS" \
    "curl -sf http://localhost:9333/cluster/status 2>/dev/null || docker compose -f $COMPOSE_FILE exec -T seaweedfs wget -qO- http://127.0.0.1:9333/cluster/status" \
    30 2; then
    check_pass "SeaweedFS is ready"
else
    check_fail "SeaweedFS" "Failed to become ready"
fi

# Graphiti (slow startup - 90s start_period)
echo -e "  ${YELLOW}Graphiti has 90s start_period - this may take a while...${NC}"
if wait_for_service "Graphiti" \
    "docker compose -f $COMPOSE_FILE exec -T graphiti curl -sf http://127.0.0.1:8000/health" \
    60 3; then
    check_pass "Graphiti is ready"
else
    check_fail "Graphiti" "Failed to become ready (check OPENAI_API_KEY)"
fi

# n8n
if wait_for_service "n8n" \
    "curl -sf http://n8n.localhost/healthz 2>/dev/null || curl -sf http://localhost:5678/healthz" \
    45 3; then
    check_pass "n8n is ready"
else
    check_fail "n8n" "Failed to become ready"
fi

# Frontend (depends on n8n, postgres, seaweedfs)
if wait_for_service "Frontend" \
    "curl -sf http://dashboard.localhost/api/health 2>/dev/null || curl -sf http://localhost:3000/api/health" \
    45 3; then
    check_pass "Frontend is ready"
else
    check_fail "Frontend" "Failed to become ready"
fi

# Traefik
if wait_for_service "Traefik" \
    "curl -sf http://localhost:8080/api/overview" \
    20 2; then
    check_pass "Traefik is ready"
else
    check_fail "Traefik" "Failed to become ready"
fi

# =============================================================================
# Step 5: Validate Health Check Status
# =============================================================================

print_subheader "Step 5: Validating Container Health Status"

# Get container health status
CONTAINERS=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | jq -r '.Name + ":" + .Health' 2>/dev/null || \
             docker compose -f "$COMPOSE_FILE" ps 2>/dev/null)

# Check each service health
for service in traefik n8n postgres redis qdrant falkordb graphiti seaweedfs frontend; do
    STATUS=$(docker compose -f "$COMPOSE_FILE" ps "$service" --format '{{.Health}}' 2>/dev/null || echo "unknown")
    case "$STATUS" in
        healthy)
            check_pass "$service container is healthy"
            ;;
        unhealthy)
            check_fail "$service" "Container is unhealthy"
            ;;
        starting)
            check_warn "$service is still starting"
            ;;
        *)
            # Some containers don't have health checks
            RUNNING=$(docker compose -f "$COMPOSE_FILE" ps "$service" --format '{{.State}}' 2>/dev/null || echo "unknown")
            if [ "$RUNNING" = "running" ]; then
                check_pass "$service container is running"
            else
                check_fail "$service" "Container state: $RUNNING"
            fi
            ;;
    esac
done

# =============================================================================
# Step 6: Validate Traefik Routing
# =============================================================================

print_subheader "Step 6: Validating Traefik Routing"

# Check n8n routing
if curl -sf -o /dev/null -w "%{http_code}" http://n8n.localhost/healthz 2>/dev/null | grep -q "200"; then
    check_pass "Traefik routes to n8n (http://n8n.localhost)"
else
    check_fail "n8n routing" "Cannot reach http://n8n.localhost/healthz"
fi

# Check dashboard routing
if curl -sf -o /dev/null -w "%{http_code}" http://dashboard.localhost/api/health 2>/dev/null | grep -q "200"; then
    check_pass "Traefik routes to dashboard (http://dashboard.localhost)"
else
    check_fail "Dashboard routing" "Cannot reach http://dashboard.localhost/api/health"
fi

# Check S3 routing (SeaweedFS)
if curl -sf http://s3.localhost/status 2>/dev/null | grep -q ""; then
    check_pass "Traefik routes to S3 (http://s3.localhost)"
else
    # SeaweedFS might not respond to /status, try cluster status
    if curl -sf http://s3.localhost 2>/dev/null; then
        check_pass "Traefik routes to S3 (http://s3.localhost)"
    else
        check_warn "S3 routing may not be working (http://s3.localhost)"
    fi
fi

# =============================================================================
# Step 7: Validate PostgreSQL Version
# =============================================================================

print_subheader "Step 7: Validating PostgreSQL Configuration"

# Check PostgreSQL version
PG_VERSION=$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -V 2>/dev/null | grep -oP '\d+\.\d+' | head -1 || echo "unknown")
if [[ "$PG_VERSION" == 18* ]]; then
    check_pass "PostgreSQL version is 18.x ($PG_VERSION) - matches Dokploy"
else
    check_fail "PostgreSQL version" "Expected 18.x, got $PG_VERSION"
fi

# Check database exists
if docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U n8n -d n8n -c "SELECT 1" > /dev/null 2>&1; then
    check_pass "Database 'n8n' exists and is accessible"
else
    check_fail "Database" "Cannot access database 'n8n'"
fi

# Check init scripts ran (look for project_state table)
if docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U n8n -d n8n -c "SELECT 1 FROM project_state LIMIT 1" > /dev/null 2>&1; then
    check_pass "Init scripts ran (project_state table exists)"
else
    check_warn "project_state table not found (init scripts may not have run)"
fi

# =============================================================================
# Step 8: Validate Service Communication
# =============================================================================

print_subheader "Step 8: Validating Cross-Service Communication"

# n8n -> PostgreSQL
if docker compose -f "$COMPOSE_FILE" exec -T n8n wget -qO- http://postgres:5432 2>/dev/null || \
   docker compose -f "$COMPOSE_FILE" logs n8n 2>&1 | grep -q "Connected to DB"; then
    check_pass "n8n can connect to PostgreSQL"
else
    check_warn "Cannot verify n8n -> PostgreSQL connection"
fi

# n8n -> Qdrant
if docker compose -f "$COMPOSE_FILE" exec -T n8n wget -qO- http://qdrant:6333/readyz 2>/dev/null; then
    check_pass "n8n can reach Qdrant"
else
    check_warn "Cannot verify n8n -> Qdrant connection"
fi

# n8n -> SeaweedFS
if docker compose -f "$COMPOSE_FILE" exec -T n8n wget -qO- http://seaweedfs:9333/cluster/status 2>/dev/null; then
    check_pass "n8n can reach SeaweedFS"
else
    check_warn "Cannot verify n8n -> SeaweedFS connection"
fi

# Frontend -> PostgreSQL
if docker compose -f "$COMPOSE_FILE" logs frontend 2>&1 | grep -qi "database\|postgres\|connected"; then
    check_pass "Frontend appears to connect to PostgreSQL"
else
    check_warn "Cannot verify Frontend -> PostgreSQL connection"
fi

# =============================================================================
# Step 9: S3 Operations Test
# =============================================================================

print_subheader "Step 9: Testing S3 Operations"

# Create test bucket
BUCKET_NAME="product-factory-artifacts"
if docker compose -f "$COMPOSE_FILE" exec -T seaweedfs wget -qO- \
    "http://127.0.0.1:8333/$BUCKET_NAME?op=create" 2>/dev/null || \
   curl -sf -X PUT "http://s3.localhost/$BUCKET_NAME" 2>/dev/null; then
    check_pass "S3 bucket creation works"
else
    check_warn "Could not verify S3 bucket creation"
fi

# =============================================================================
# Summary
# =============================================================================

print_header "Validation Summary"

echo ""
echo -e "  ${BOLD}Total Checks:${NC}  $TOTAL_CHECKS"
echo -e "  ${GREEN}Passed:${NC}        $PASSED_CHECKS"
echo -e "  ${RED}Failed:${NC}        $FAILED_CHECKS"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  All validations passed! Environment matches Dokploy.       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}Access Points:${NC}"
    echo -e "    - Traefik Dashboard: ${CYAN}http://localhost:8080${NC}"
    echo -e "    - n8n:               ${CYAN}http://n8n.localhost${NC}"
    echo -e "    - Dashboard:         ${CYAN}http://dashboard.localhost${NC}"
    echo -e "    - S3 Storage:        ${CYAN}http://s3.localhost${NC}"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  Some validations failed! See details above.                 ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}Failed Services:${NC}"
    for svc in "${FAILED_SERVICES[@]}"; do
        echo -e "    ${RED}✗${NC} $svc"
    done
    echo ""
    echo -e "  ${BOLD}Debug Commands:${NC}"
    echo -e "    docker compose -f $COMPOSE_FILE logs <service>"
    echo -e "    docker compose -f $COMPOSE_FILE ps"
    echo -e "    docker compose -f $COMPOSE_FILE exec <service> sh"
    exit 1
fi
