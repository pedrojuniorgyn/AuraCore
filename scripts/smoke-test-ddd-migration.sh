#!/bin/bash
# ============================================================================
# SMOKE TEST - DDD Migration Financial/Fiscal
# 
# Executa testes de sanidade após deploy da migração DDD.
# Deve ser executado após deploy em homologação ou produção.
#
# Uso: ./scripts/smoke-test-ddd-migration.sh [BASE_URL]
# Exemplo: ./scripts/smoke-test-ddd-migration.sh https://erp.empresa.com.br
# ============================================================================

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
PASS=0
FAIL=0
TOTAL=0

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"
  TOTAL=$((TOTAL + 1))
  
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Content-Type: application/json" \
    "$url" 2>/dev/null || echo "000")
  
  if [ "$status" = "$expected_status" ]; then
    echo -e "  ${GREEN}✓${NC} $name (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${NC} $name (HTTP $status, esperado $expected_status)"
    FAIL=$((FAIL + 1))
  fi
}

echo "============================================"
echo " SMOKE TEST - DDD Migration Financial/Fiscal"
echo " Base URL: $BASE_URL"
echo " Data: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# --- 1. HEALTH CHECK ---
echo "1. Health Check"
check "Health endpoint" "$BASE_URL/api/health"
echo ""

# --- 2. FINANCIAL V1 ROUTES ---
echo "2. Financial V1 Routes (migradas para DDD imports)"
check "GET /api/financial/payables" "$BASE_URL/api/financial/payables"
check "GET /api/financial/receivables" "$BASE_URL/api/financial/receivables"
check "GET /api/financial/billing" "$BASE_URL/api/financial/billing"
check "GET /api/financial/categories" "$BASE_URL/api/financial/categories"
check "GET /api/financial/bank-accounts" "$BASE_URL/api/financial/bank-accounts"
check "GET /api/financial/cost-centers" "$BASE_URL/api/financial/cost-centers"
check "GET /api/financial/remittances" "$BASE_URL/api/financial/remittances"
check "GET /api/financial/dda" "$BASE_URL/api/financial/dda"
check "GET /api/financial/bank-transactions" "$BASE_URL/api/financial/bank-transactions"
check "GET /api/financial/tax-credits" "$BASE_URL/api/financial/tax-credits"
check "GET /api/financial/cash-flow" "$BASE_URL/api/financial/cash-flow"
check "GET /api/financial/reports/dre" "$BASE_URL/api/financial/reports/dre"
echo ""

# --- 3. FISCAL V1 ROUTES ---
echo "3. Fiscal V1 Routes (migradas para DDD imports)"
check "GET /api/fiscal/cte" "$BASE_URL/api/fiscal/cte"
check "GET /api/fiscal/cte/summary" "$BASE_URL/api/fiscal/cte/summary"
check "GET /api/fiscal/mdfe" "$BASE_URL/api/fiscal/mdfe"
check "GET /api/fiscal/settings" "$BASE_URL/api/fiscal/settings"
check "GET /api/fiscal/documents" "$BASE_URL/api/fiscal/documents"
echo ""

# --- 4. V2 ROUTES REMOVED ---
echo "4. V2 Financial Routes (devem retornar 404)"
check "V2 payables removido" "$BASE_URL/api/v2/financial/payables" "404"
check "V2 receivables removido" "$BASE_URL/api/v2/financial/receivables" "404"
check "V2 billing removido" "$BASE_URL/api/v2/financial/billing" "404"
echo ""

# --- 5. DASHBOARD ---
echo "5. Dashboard"
check "Financial Dashboard" "$BASE_URL/financeiro/dashboard"
echo ""

# --- RESULTADO ---
echo "============================================"
if [ $FAIL -eq 0 ]; then
  echo -e " ${GREEN}RESULTADO: $PASS/$TOTAL PASSARAM${NC}"
  echo " Status: APROVADO para produção"
else
  echo -e " ${RED}RESULTADO: $PASS/$TOTAL passaram, $FAIL falharam${NC}"
  echo -e " ${YELLOW}Status: VERIFICAR falhas antes de prosseguir${NC}"
fi
echo "============================================"

exit $FAIL
