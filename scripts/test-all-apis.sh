#!/bin/bash

# ==============================================================================
# AURACORE - TESTE COMPLETO DE APIs
# ==============================================================================

BASE_URL="${BASE_URL:-https://tcl.auracore.cloud}"
RESULTS_FILE="/tmp/api-test-results-$(date +%Y%m%d-%H%M%S).md"
ERRORS_FILE="/tmp/api-test-errors-$(date +%Y%m%d-%H%M%S).log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contadores
TOTAL=0
SUCCESS_200=0
SUCCESS_401=0
ERROR_404=0
ERROR_500=0
ERROR_OTHER=0

# Token de autenticação (passado como argumento ou variável de ambiente)
SESSION_TOKEN="${SESSION_TOKEN:-$1}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 AURACORE - TESTE COMPLETO DE APIs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Base URL: $BASE_URL"
echo "Data: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ==============================================================================
# FUNÇÃO DE TESTE
# ==============================================================================

test_endpoint() {
  local METHOD=$1
  local ENDPOINT=$2
  local DESCRIPTION=$3
  
  TOTAL=$((TOTAL + 1))
  
  # Fazer requisição
  if [ -n "$SESSION_TOKEN" ]; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "$BASE_URL$ENDPOINT" \
      -H "Cookie: __Secure-authjs.session-token=$SESSION_TOKEN" \
      -H "Content-Type: application/json" \
      --connect-timeout 10 \
      --max-time 30 2>/dev/null)
  else
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "$BASE_URL$ENDPOINT" \
      -H "Content-Type: application/json" \
      --connect-timeout 10 \
      --max-time 30 2>/dev/null)
  fi
  
  STATUS_CODE="$RESPONSE"
  
  # Classificar resultado
  if [ "$STATUS_CODE" = "200" ] || [ "$STATUS_CODE" = "201" ]; then
    SUCCESS_200=$((SUCCESS_200 + 1))
    echo -e "${GREEN}✅ $STATUS_CODE${NC} $METHOD $ENDPOINT"
    echo "| ✅ | $METHOD | \`$ENDPOINT\` | $STATUS_CODE | $DESCRIPTION |" >> "$RESULTS_FILE"
    
  elif [ "$STATUS_CODE" = "401" ] || [ "$STATUS_CODE" = "403" ]; then
    SUCCESS_401=$((SUCCESS_401 + 1))
    echo -e "${YELLOW}🔒 $STATUS_CODE${NC} $METHOD $ENDPOINT (Auth)"
    echo "| 🔒 | $METHOD | \`$ENDPOINT\` | $STATUS_CODE | $DESCRIPTION (Auth) |" >> "$RESULTS_FILE"
    
  elif [ "$STATUS_CODE" = "404" ]; then
    ERROR_404=$((ERROR_404 + 1))
    echo -e "${YELLOW}⚠️ 404${NC} $METHOD $ENDPOINT"
    echo "| ⚠️ | $METHOD | \`$ENDPOINT\` | 404 | $DESCRIPTION (Not Found) |" >> "$RESULTS_FILE"
    
  elif [ "$STATUS_CODE" = "500" ] || [ "$STATUS_CODE" = "502" ] || [ "$STATUS_CODE" = "503" ]; then
    ERROR_500=$((ERROR_500 + 1))
    echo -e "${RED}❌ $STATUS_CODE${NC} $METHOD $ENDPOINT"
    echo "| ❌ | $METHOD | \`$ENDPOINT\` | $STATUS_CODE | $DESCRIPTION (ERRO) |" >> "$RESULTS_FILE"
    
    # Capturar body do erro
    if [ -n "$SESSION_TOKEN" ]; then
      ERROR_BODY=$(curl -s -X "$METHOD" "$BASE_URL$ENDPOINT" \
        -H "Cookie: __Secure-authjs.session-token=$SESSION_TOKEN" \
        -H "Content-Type: application/json" \
        --connect-timeout 10 \
        --max-time 30 2>/dev/null | head -c 500)
    else
      ERROR_BODY=$(curl -s -X "$METHOD" "$BASE_URL$ENDPOINT" \
        -H "Content-Type: application/json" \
        --connect-timeout 10 \
        --max-time 30 2>/dev/null | head -c 500)
    fi
    
    echo "=== ERROR: $METHOD $ENDPOINT ===" >> "$ERRORS_FILE"
    echo "$ERROR_BODY" >> "$ERRORS_FILE"
    echo "" >> "$ERRORS_FILE"
    
  elif [ "$STATUS_CODE" = "000" ]; then
    ERROR_OTHER=$((ERROR_OTHER + 1))
    echo -e "${RED}⏱️ TIMEOUT${NC} $METHOD $ENDPOINT"
    echo "| ⏱️ | $METHOD | \`$ENDPOINT\` | TIMEOUT | $DESCRIPTION |" >> "$RESULTS_FILE"
    
  else
    ERROR_OTHER=$((ERROR_OTHER + 1))
    echo -e "${RED}❓ $STATUS_CODE${NC} $METHOD $ENDPOINT"
    echo "| ❓ | $METHOD | \`$ENDPOINT\` | $STATUS_CODE | $DESCRIPTION |" >> "$RESULTS_FILE"
  fi
}

# ==============================================================================
# INICIALIZAR ARQUIVO DE RESULTADOS
# ==============================================================================

cat > "$RESULTS_FILE" << EOF
# 🧪 TESTE COMPLETO DE APIs - AURACORE

**Data:** $(date '+%Y-%m-%d %H:%M:%S')  
**Base URL:** $BASE_URL

---

## 📊 Resultados

| Status | Método | Endpoint | Code | Descrição |
|--------|--------|----------|------|-----------|
EOF

touch "$ERRORS_FILE"

# ==============================================================================
# TESTES POR MÓDULO
# ==============================================================================

echo ""
echo "🚀 Iniciando testes de APIs..."
echo ""

# ------------------------------------------------------------------------------
# HEALTH & MONITORING
# ------------------------------------------------------------------------------
echo -e "${BLUE}### Health & Monitoring${NC}"
test_endpoint "GET" "/api/health" "Health check"
test_endpoint "GET" "/api/ops/health/status" "Status operacional"

# ------------------------------------------------------------------------------
# AUTHENTICATION & SESSION
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Authentication & Session${NC}"
test_endpoint "GET" "/api/auth/session" "Verificar sessão"
test_endpoint "GET" "/api/auth/providers" "Listar providers"

# ------------------------------------------------------------------------------
# ORGANIZATIONS & BRANCHES
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Organizations & Branches${NC}"
test_endpoint "GET" "/api/organizations" "Listar organizações"
test_endpoint "GET" "/api/branches" "Listar filiais"
test_endpoint "GET" "/api/branches/current" "Filial atual"

# ------------------------------------------------------------------------------
# USERS & RBAC
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Users & RBAC${NC}"
test_endpoint "GET" "/api/users" "Listar usuários"
test_endpoint "GET" "/api/users/me" "Usuário atual"
test_endpoint "GET" "/api/roles" "Listar roles"
test_endpoint "GET" "/api/permissions" "Listar permissões"

# ------------------------------------------------------------------------------
# STRATEGIC MODULE
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Strategic Module${NC}"
test_endpoint "GET" "/api/strategic/strategies" "Listar estratégias"
test_endpoint "GET" "/api/strategic/goals" "Listar objetivos"
test_endpoint "GET" "/api/strategic/kpis" "Listar KPIs"
test_endpoint "GET" "/api/strategic/action-plans" "Listar planos de ação"
test_endpoint "GET" "/api/strategic/action-plans/kanban" "Kanban de ações"
test_endpoint "GET" "/api/strategic/ideas" "Caixa de ideias"
test_endpoint "GET" "/api/strategic/swot" "Análise SWOT"
test_endpoint "GET" "/api/strategic/war-room/dashboard" "War Room"
test_endpoint "GET" "/api/strategic/map" "Mapa estratégico"
test_endpoint "GET" "/api/strategic/dashboard/data" "Dashboard data"
test_endpoint "GET" "/api/strategic/control-items" "Itens de controle"
test_endpoint "GET" "/api/strategic/verification-items" "Itens de verificação"
test_endpoint "GET" "/api/strategic/standard-procedures" "Procedimentos padrão"

# ------------------------------------------------------------------------------
# FINANCIAL MODULE
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Financial Module${NC}"
test_endpoint "GET" "/api/financial/payables" "Contas a pagar"
test_endpoint "GET" "/api/financial/receivables" "Contas a receber"
test_endpoint "GET" "/api/financial/bank-accounts" "Contas bancárias"
test_endpoint "GET" "/api/financial/bank-transactions" "Transações bancárias"
test_endpoint "GET" "/api/financial/categories" "Categorias"
test_endpoint "GET" "/api/cost-centers" "Centros de custo"
test_endpoint "GET" "/api/financial/receipts" "Recibos"
test_endpoint "GET" "/api/financial/expense-reports" "Relatórios de despesa"

# ------------------------------------------------------------------------------
# ACCOUNTING MODULE
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Accounting Module${NC}"
test_endpoint "GET" "/api/accounting/journal-entries" "Lançamentos contábeis"
test_endpoint "GET" "/api/accounting/chart-of-accounts" "Plano de contas"
test_endpoint "GET" "/api/accounting/fiscal-entries" "Entradas fiscais"

# ------------------------------------------------------------------------------
# FISCAL MODULE
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Fiscal Module${NC}"
test_endpoint "GET" "/api/fiscal/documents" "Documentos fiscais"
test_endpoint "GET" "/api/fiscal/nfe" "Notas Fiscais (NFe)"
test_endpoint "GET" "/api/fiscal/cte" "Conhecimentos (CTe)"
test_endpoint "GET" "/api/fiscal/mdfe" "Manifestos (MDFe)"
test_endpoint "GET" "/api/fiscal/nfse" "Notas de Serviço (NFS-e)"
test_endpoint "GET" "/api/fiscal/tax-credits" "Créditos tributários"
test_endpoint "GET" "/api/fiscal/tax-rules" "Regras tributárias"
test_endpoint "GET" "/api/fiscal/sped" "SPED"

# ------------------------------------------------------------------------------
# TMS (TRANSPORT MANAGEMENT)
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### TMS - Transport Management${NC}"
test_endpoint "GET" "/api/tms/trips" "Viagens"
test_endpoint "GET" "/api/tms/vehicles" "Veículos"
test_endpoint "GET" "/api/tms/drivers" "Motoristas"
test_endpoint "GET" "/api/tms/romaneios" "Romaneios"
test_endpoint "GET" "/api/tms/pickup-orders" "Ordens de coleta"
test_endpoint "GET" "/api/tms/cargo-documents" "Documentos de carga"
test_endpoint "GET" "/api/tms/freight-quotes" "Cotações de frete"
test_endpoint "GET" "/api/tms/freight-tables" "Tabelas de frete"

# ------------------------------------------------------------------------------
# WMS (WAREHOUSE MANAGEMENT)
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### WMS - Warehouse Management${NC}"
test_endpoint "GET" "/api/wms/locations" "Localizações"
test_endpoint "GET" "/api/wms/stock-items" "Itens de estoque"
test_endpoint "GET" "/api/wms/stock-movements" "Movimentações"
test_endpoint "GET" "/api/wms/inventory-counts" "Inventários"

# ------------------------------------------------------------------------------
# MASTER DATA
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Master Data${NC}"
test_endpoint "GET" "/api/business-partners" "Parceiros de negócio"
test_endpoint "GET" "/api/products" "Produtos"
test_endpoint "GET" "/api/payment-terms" "Condições de pagamento"
test_endpoint "GET" "/api/units-of-measure" "Unidades de medida"

# ------------------------------------------------------------------------------
# FLEET MANAGEMENT
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Fleet Management${NC}"
test_endpoint "GET" "/api/fleet/vehicles" "Veículos"
test_endpoint "GET" "/api/fleet/drivers" "Motoristas"
test_endpoint "GET" "/api/fleet/fuel-transactions" "Transações de combustível"
test_endpoint "GET" "/api/fleet/maintenance" "Manutenções"

# ------------------------------------------------------------------------------
# CRM
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### CRM${NC}"
test_endpoint "GET" "/api/crm/leads" "Leads"
test_endpoint "GET" "/api/crm/activities" "Atividades"

# ------------------------------------------------------------------------------
# DOCUMENTS
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Documents${NC}"
test_endpoint "GET" "/api/documents" "Listar documentos"
test_endpoint "GET" "/api/documents/jobs" "Jobs de documentos"

# ------------------------------------------------------------------------------
# AGENT / AI
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Agent / AI${NC}"
test_endpoint "GET" "/api/agent/sessions" "Sessões do agente"
test_endpoint "GET" "/api/agent/messages" "Mensagens do agente"

# ------------------------------------------------------------------------------
# NOTIFICATIONS
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Notifications${NC}"
test_endpoint "GET" "/api/notifications" "Notificações"
test_endpoint "GET" "/api/notifications/unread" "Não lidas"

# ------------------------------------------------------------------------------
# AUDIT
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Audit${NC}"
test_endpoint "GET" "/api/audit/logs" "Logs de auditoria"

# ------------------------------------------------------------------------------
# REPORTS
# ------------------------------------------------------------------------------
echo ""
echo -e "${BLUE}### Reports${NC}"
test_endpoint "GET" "/api/reports/cte-margin" "Margem CTe"
test_endpoint "GET" "/api/reports/financial" "Relatório financeiro"
test_endpoint "GET" "/api/reports/fiscal" "Relatório fiscal"

# ==============================================================================
# CALCULAR ESTATÍSTICAS
# ==============================================================================

FUNC_TOTAL=$((SUCCESS_200 + SUCCESS_401))
if [ $TOTAL -gt 0 ]; then
  RATE=$(echo "scale=1; ($FUNC_TOTAL * 100) / $TOTAL" | bc 2>/dev/null || echo "0")
else
  RATE="0"
fi

# ==============================================================================
# FINALIZAR RELATÓRIO
# ==============================================================================

cat >> "$RESULTS_FILE" << EOF

---

## 📈 Estatísticas

| Métrica | Quantidade |
|---------|------------|
| **Total de Endpoints** | $TOTAL |
| ✅ **Sucesso (200/201)** | $SUCCESS_200 |
| 🔒 **Auth OK (401/403)** | $SUCCESS_401 |
| ⚠️ **Não Encontrado (404)** | $ERROR_404 |
| ❌ **Erro Interno (5xx)** | $ERROR_500 |
| ❓ **Outros/Timeout** | $ERROR_OTHER |

---

## 🎯 Taxa de Sucesso

**Total Funcional:** $FUNC_TOTAL / $TOTAL  
**Taxa:** ${RATE}%

---

## 🐛 Erros 500 Detectados

$([ $ERROR_500 -gt 0 ] && echo "Ver detalhes em: $ERRORS_FILE" || echo "Nenhum erro 500 detectado! ✅")

---

**Teste executado em:** $(date '+%Y-%m-%d %H:%M:%S')
EOF

# ==============================================================================
# EXIBIR RESUMO
# ==============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO DOS TESTES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Total de Endpoints:       $TOTAL"
echo -e "${GREEN}✅ Sucesso (200/201):     $SUCCESS_200${NC}"
echo -e "${YELLOW}🔒 Auth OK (401/403):     $SUCCESS_401${NC}"
echo -e "${YELLOW}⚠️  Não Encontrado (404): $ERROR_404${NC}"
echo -e "${RED}❌ Erro Interno (5xx):    $ERROR_500${NC}"
echo -e "${RED}❓ Outros/Timeout:        $ERROR_OTHER${NC}"
echo ""
echo "Taxa de Sucesso:          ${RATE}%"
echo ""
echo "Relatório completo:       $RESULTS_FILE"
[ $ERROR_500 -gt 0 ] && echo -e "${RED}Erros detalhados:         $ERRORS_FILE${NC}"
echo ""

# Exportar paths para uso posterior
echo "$RESULTS_FILE" > /tmp/last-api-test-results.txt
echo "$ERRORS_FILE" > /tmp/last-api-test-errors.txt

echo "✅ Teste concluído!"
