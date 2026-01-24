#!/bin/bash
# Script de Teste Completo de TODAS as APIs
# Detecta erros 500 e reporta status do sistema

BASE_URL="${BASE_URL:-https://tcl.auracore.cloud}"
RESULTS_FILE="/tmp/api-complete-test-$(date +%Y%m%d-%H%M%S).log"

# Obter token (se fornecido via env)
TOKEN="${AUTH_TOKEN:-}"

echo "🧪 === TESTE COMPLETO DE APIs ===" | tee -a "$RESULTS_FILE"
echo "Base URL: $BASE_URL" | tee -a "$RESULTS_FILE"
echo "Data: $(date)" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"

# Array de endpoints críticos (principais módulos)
declare -a ENDPOINTS=(
  # Core
  "GET /api/health"
  
  # Strategic (principais)
  "GET /api/strategic/strategies"
  "GET /api/strategic/goals"
  "GET /api/strategic/kpis"
  "GET /api/strategic/action-plans"
  "GET /api/strategic/notifications"
  
  # Financial (principais)
  "GET /api/financial/payables"
  "GET /api/financial/receivables"
  "GET /api/financial/payments"
  "GET /api/financial/bank-accounts"
  "GET /api/financial/categories"
  
  # TMS (principais)
  "GET /api/tms/trips"
  "GET /api/tms/vehicles"
  "GET /api/tms/drivers"
  "GET /api/tms/romaneios"
  
  # Fiscal (principais)
  "GET /api/fiscal/documents"
  "GET /api/fiscal/cte"
  
  # WMS (principais)
  "GET /api/wms/locations"
  "GET /api/wms/stock-items"
  
  # Notifications (CRÍTICO - corrigido hoje)
  "GET /api/notifications"
  "GET /api/strategic/notifications"
  
  # Documents (CRÍTICO - corrigido hoje)
  "GET /api/documents"
)

TOTAL=0
SUCCESS_200=0
SUCCESS_401=0
ERROR_500=0
ERROR_404=0
ERROR_OTHER=0

for ENDPOINT in "${ENDPOINTS[@]}"; do
  METHOD=$(echo $ENDPOINT | awk '{print $1}')
  PATH=$(echo $ENDPOINT | awk '{print $2}')
  
  TOTAL=$((TOTAL + 1))
  
  # Curl com timeout
  if [ -n "$TOKEN" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -X $METHOD "$BASE_URL$PATH" \
      -H "Cookie: __Secure-authjs.session-token=$TOKEN" \
      --max-time 10 2>/dev/null || echo "000")
  else
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      -X $METHOD "$BASE_URL$PATH" \
      --max-time 10 2>/dev/null || echo "000")
  fi
  
  case $STATUS in
    200)
      SUCCESS_200=$((SUCCESS_200 + 1))
      echo "✅ $METHOD $PATH - 200" | tee -a "$RESULTS_FILE"
      ;;
    401)
      SUCCESS_401=$((SUCCESS_401 + 1))
      echo "🔒 $METHOD $PATH - 401 (auth required)" | tee -a "$RESULTS_FILE"
      ;;
    500)
      ERROR_500=$((ERROR_500 + 1))
      echo "❌ $METHOD $PATH - 500 (SERVER ERROR)" | tee -a "$RESULTS_FILE"
      ;;
    404)
      ERROR_404=$((ERROR_404 + 1))
      echo "⚠️  $METHOD $PATH - 404 (not found)" | tee -a "$RESULTS_FILE"
      ;;
    000)
      ERROR_OTHER=$((ERROR_OTHER + 1))
      echo "🔴 $METHOD $PATH - TIMEOUT/CONNECTION ERROR" | tee -a "$RESULTS_FILE"
      ;;
    *)
      ERROR_OTHER=$((ERROR_OTHER + 1))
      echo "❓ $METHOD $PATH - $STATUS" | tee -a "$RESULTS_FILE"
      ;;
  esac
done

echo "" | tee -a "$RESULTS_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$RESULTS_FILE"
echo "📊 RESUMO FINAL" | tee -a "$RESULTS_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$RESULTS_FILE"
echo "Total testado: $TOTAL" | tee -a "$RESULTS_FILE"
echo "✅ 200 OK: $SUCCESS_200" | tee -a "$RESULTS_FILE"
echo "🔒 401 Auth: $SUCCESS_401" | tee -a "$RESULTS_FILE"
echo "❌ 500 Error: $ERROR_500" | tee -a "$RESULTS_FILE"
echo "⚠️  404 Not Found: $ERROR_404" | tee -a "$RESULTS_FILE"
echo "🔴 Timeout/Other: $ERROR_OTHER" | tee -a "$RESULTS_FILE"

TOTAL_SUCCESS=$((SUCCESS_200 + SUCCESS_401))
if [ $TOTAL -gt 0 ]; then
  SUCCESS_RATE=$(echo "scale=2; ($TOTAL_SUCCESS * 100) / $TOTAL" | bc)
else
  SUCCESS_RATE=0
fi

echo "" | tee -a "$RESULTS_FILE"
echo "Taxa de Sucesso (200+401): ${SUCCESS_RATE}%" | tee -a "$RESULTS_FILE"
echo "" | tee -a "$RESULTS_FILE"
echo "Log completo salvo em: $RESULTS_FILE" | tee -a "$RESULTS_FILE"

if [ $ERROR_500 -gt 0 ]; then
  echo "" | tee -a "$RESULTS_FILE"
  echo "🔴 ATENÇÃO: $ERROR_500 endpoints com erro 500!" | tee -a "$RESULTS_FILE"
  echo "Sistema NÃO está 100% funcional." | tee -a "$RESULTS_FILE"
  exit 1
else
  echo "" | tee -a "$RESULTS_FILE"
  echo "✅ Sistema operacional - 0 erros 500!" | tee -a "$RESULTS_FILE"
  exit 0
fi
