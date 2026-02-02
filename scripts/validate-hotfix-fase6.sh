#!/bin/bash
# ========================================
# Validation Script: Hotfix Fase 6
# ========================================
# Valida que as correções foram aplicadas corretamente
# Data: 2026-02-02

set -e

echo "========================================="
echo "🔍 Validating Hotfix Fase 6"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0

# Function to run SQL and check result
check_sql() {
    local description="$1"
    local sql="$2"
    local expected="$3"
    
    echo -n "Checking: $description... "
    
    # Run query via npm script (adjust to your setup)
    result=$(npm run db:query --silent -- "$sql" 2>/dev/null | tail -n 1)
    
    if [ "$result" == "$expected" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Got: $result"
        ((FAILED++))
    fi
}

echo "========================================="
echo "1. Schema Validation"
echo "========================================="

# Check if who_email column exists
echo -n "Checking: who_email column exists... "
SQL="SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'strategic_action_plan' AND COLUMN_NAME = 'who_email'"
# Adjust this to match your db query method
echo -e "${YELLOW}MANUAL CHECK REQUIRED${NC}"
echo "  Run: $SQL"
echo ""

echo "========================================="
echo "2. Foreign Keys Validation"
echo "========================================="

# Check FK count
echo -n "Checking: All 3 FKs created... "
SQL="SELECT COUNT(*) FROM sys.foreign_keys WHERE name IN ('fk_approval_history_org', 'fk_approval_delegate_org', 'FK_department_organization')"
echo -e "${YELLOW}MANUAL CHECK REQUIRED${NC}"
echo "  Run: $SQL"
echo "  Expected: 3"
echo ""

echo "========================================="
echo "3. API Health Checks"
echo "========================================="

BASE_URL="${BASE_URL:-http://localhost:3000}"

# Dashboard API
echo -n "Testing: GET /api/strategic/dashboard/data... "
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/strategic/dashboard/data" || true)
if [ "$response" == "200" ]; then
    echo -e "${GREEN}✓ PASS (200)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL ($response)${NC}"
    ((FAILED++))
fi

# Map API
echo -n "Testing: GET /api/strategic/map... "
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/strategic/map" || true)
if [ "$response" == "200" ]; then
    echo -e "${GREEN}✓ PASS (200)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL ($response)${NC}"
    ((FAILED++))
fi

# PDCA Kanban API
echo -n "Testing: GET /api/strategic/action-plans/kanban... "
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/strategic/action-plans/kanban" || true)
if [ "$response" == "200" ]; then
    echo -e "${GREEN}✓ PASS (200)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL ($response)${NC}"
    ((FAILED++))
fi

# Goals API
echo -n "Testing: GET /api/strategic/goals/new... "
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/strategic/goals/new" || true)
if [ "$response" == "200" ]; then
    echo -e "${GREEN}✓ PASS (200)${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL ($response)${NC}"
    ((FAILED++))
fi

echo ""
echo "========================================="
echo "Summary"
echo "========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready for production.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Review errors above.${NC}"
    exit 1
fi
