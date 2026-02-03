#!/bin/bash
#
# Script de teste da API de relatórios PDF
# Uso: ./scripts/test-reports-api.sh
#

set -e

echo "🧪 === TESTE DA API DE RELATÓRIOS PDF ==="
echo ""

# Configuração
BASE_URL="http://localhost:3000"
API_ENDPOINT="/api/reports/generate"

# Verificar se servidor está rodando
echo "1️⃣ Verificando se servidor está rodando..."
if ! curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}" | grep -q "200\|404"; then
  echo "❌ Servidor não está rodando em ${BASE_URL}"
  echo "   Execute: npm run dev"
  exit 1
fi
echo "✅ Servidor rodando"
echo ""

# Teste 1: BSC Completo
echo "2️⃣ Testando relatório BSC Completo..."
curl -X POST "${BASE_URL}${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN_HERE" \
  -d '{
    "type": "BSC_COMPLETE",
    "period": {
      "from": "2026-01-01",
      "to": "2026-02-03"
    },
    "options": {
      "includeCharts": false,
      "orientation": "portrait"
    }
  }' \
  -o "report_bsc_test.pdf" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

if [ -f "report_bsc_test.pdf" ]; then
  SIZE=$(du -h report_bsc_test.pdf | cut -f1)
  echo "✅ PDF gerado: report_bsc_test.pdf (${SIZE})"
  echo "   Abrir: open report_bsc_test.pdf"
else
  echo "❌ Falha ao gerar PDF"
fi
echo ""

# Teste 2: Desempenho (Performance)
echo "3️⃣ Testando relatório de Desempenho..."
curl -X POST "${BASE_URL}${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN_HERE" \
  -d '{
    "type": "PERFORMANCE",
    "period": {
      "from": "2026-01-01",
      "to": "2026-02-03"
    }
  }' \
  -o "report_performance_test.pdf" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

if [ -f "report_performance_test.pdf" ]; then
  SIZE=$(du -h report_performance_test.pdf | cut -f1)
  echo "✅ PDF gerado: report_performance_test.pdf (${SIZE})"
else
  echo "❌ Falha ao gerar PDF"
fi
echo ""

# Teste 3: Aprovações
echo "4️⃣ Testando relatório de Aprovações..."
curl -X POST "${BASE_URL}${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN_HERE" \
  -d '{
    "type": "APPROVALS",
    "period": {
      "from": "2026-01-01",
      "to": "2026-02-03"
    }
  }' \
  -o "report_approvals_test.pdf" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

if [ -f "report_approvals_test.pdf" ]; then
  SIZE=$(du -h report_approvals_test.pdf | cut -f1)
  echo "✅ PDF gerado: report_approvals_test.pdf (${SIZE})"
else
  echo "❌ Falha ao gerar PDF"
fi
echo ""

echo "🏁 Testes concluídos!"
echo ""
echo "📊 Arquivos gerados:"
ls -lh report_*_test.pdf 2>/dev/null || echo "   Nenhum PDF gerado"
echo ""
echo "⚠️ NOTA: Se os testes falharam com 401/403, você precisa:"
echo "   1. Fazer login no app (http://localhost:3000)"
echo "   2. Copiar o cookie 'auth-token' do navegador (DevTools)"
echo "   3. Substituir 'YOUR_TOKEN_HERE' neste script"
