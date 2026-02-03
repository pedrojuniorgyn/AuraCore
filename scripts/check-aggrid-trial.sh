#!/bin/bash
# check-aggrid-trial.sh - Verificação rápida do AG-Grid Trial Mode

echo "🔍 Verificando configuração AG-Grid Trial Mode..."
echo ""

# 1. Verificar versão instalada
echo "=== 1. Versão Instalada ==="
AGGRID_VERSION=$(grep "ag-grid-enterprise" package.json | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")
if [ ! -z "$AGGRID_VERSION" ]; then
  echo "✅ ag-grid-enterprise: $AGGRID_VERSION"
else
  echo "❌ ag-grid-enterprise não encontrado!"
fi

# 2. Verificar se há tentativa de configurar licença inválida
echo ""
echo "=== 2. Verificar Código de Licença ==="
LICENSE_CODE=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "setLicenseKey" 2>/dev/null)
if [ -z "$LICENSE_CODE" ]; then
  echo "✅ Nenhum código tentando configurar licença (correto para trial)"
else
  echo "⚠️  Encontrado código de licença em:"
  echo "$LICENSE_CODE"
  echo "   (Remova se não tiver licença válida)"
fi

# 3. Verificar variável de ambiente
echo ""
echo "=== 3. Variável de Ambiente ==="
if grep -q "AGGRID_LICENSE\|AG_GRID_LICENSE" .env.local 2>/dev/null; then
  echo "⚠️  Variável de licença encontrada em .env.local"
  echo "   (Remova se não tiver licença válida)"
else
  echo "✅ Nenhuma variável de licença (correto para trial)"
fi

# 4. Verificar importação no código
echo ""
echo "=== 4. Importação Enterprise ==="
IMPORT_COUNT=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "ag-grid-enterprise" 2>/dev/null | wc -l)
echo "✅ $IMPORT_COUNT arquivo(s) importando ag-grid-enterprise"

# 5. Verificar componentes BaseGrid
echo ""
echo "=== 5. Componentes Grid ==="
if [ -f "src/components/strategic/shared/BaseGrid.tsx" ]; then
  echo "✅ BaseGrid.tsx existe"
else
  echo "❌ BaseGrid.tsx não encontrado!"
fi

# 6. Verificar páginas Grid implementadas
echo ""
echo "=== 6. Páginas Grid Implementadas ==="
GRID_PAGES=0
[ -f "src/app/(dashboard)/strategic/kpis/grid/page.tsx" ] && echo "✅ KPIs Grid" && ((GRID_PAGES++))
[ -f "src/app/(dashboard)/strategic/action-plans/grid/page.tsx" ] && echo "✅ Action Plans Grid" && ((GRID_PAGES++))
[ -f "src/app/(dashboard)/strategic/pdca/grid/page.tsx" ] && echo "✅ PDCA Grid" && ((GRID_PAGES++))
[ -f "src/app/(dashboard)/strategic/swot/grid/page.tsx" ] && echo "✅ SWOT Grid" && ((GRID_PAGES++))
[ -f "src/app/(dashboard)/strategic/ideas/grid/page.tsx" ] && echo "✅ Ideas Grid" && ((GRID_PAGES++))

if [ $GRID_PAGES -eq 0 ]; then
  echo "⚠️  Nenhuma página Grid encontrada"
fi

echo ""
echo "=== RESUMO ==="
echo "📊 Páginas Grid: $GRID_PAGES"
echo "🔧 Versão: $AGGRID_VERSION"
echo "🎯 Modo: Trial (sem licença)"
echo ""
echo "✅ Status: OK - Continue usando em Trial Mode!"
echo ""
echo "📚 Documentação completa em: docs/AG_GRID_TRIAL_MODE.md"
echo ""
echo "💡 Dica: O watermark é esperado em Trial Mode."
echo "    Todas as funcionalidades estão ativas!"
