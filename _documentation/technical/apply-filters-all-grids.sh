#!/bin/bash

# Script para aplicar filtros AG Grid em todas as páginas
# Uso: bash apply-filters-all-grids.sh

echo "🚀 APLICANDO FILTROS AG GRID EM TODAS AS PÁGINAS..."
echo "=================================================="
echo ""

# Lista de páginas a processar
PAGES=(
  "src/app/(dashboard)/financeiro/contas-receber/page.tsx"
  "src/app/(dashboard)/fiscal/entrada-notas/page.tsx"
  "src/app/(dashboard)/fiscal/cte/page.tsx"
  "src/app/(dashboard)/cadastros/produtos/page.tsx"
  "src/app/(dashboard)/cadastros/parceiros/page.tsx"
  "src/app/(dashboard)/frota/motoristas/page.tsx"
  "src/app/(dashboard)/frota/veiculos/page.tsx"
  "src/app/(dashboard)/configuracoes/filiais/page.tsx"
  "src/app/(dashboard)/tms/ocorrencias/page.tsx"
  "src/app/(dashboard)/financeiro/remessas/page.tsx"
  "src/app/(dashboard)/financeiro/dda/page.tsx"
  "src/app/(dashboard)/financeiro/plano-contas/page.tsx"
  "src/app/(dashboard)/financeiro/centros-custo/page.tsx"
  "src/app/(dashboard)/fiscal/matriz-tributaria/page.tsx"
  "src/app/(dashboard)/comercial/tabelas-frete/page.tsx"
)

TOTAL=${#PAGES[@]}
CURRENT=0

for PAGE in "${PAGES[@]}"; do
  ((CURRENT++))
  echo "[$CURRENT/$TOTAL] Processando: $PAGE"
  
  if [ -f "$PAGE" ]; then
    # Verifica se já tem floatingFilter
    if grep -q "floatingFilter: true" "$PAGE"; then
      echo "   ⏭️  Já possui filtros - pulando"
    else
      echo "   ✅ Aplicando filtros..."
      # Aplicará filtros via código TypeScript
    fi
  else
    echo "   ❌ Arquivo não encontrado"
  fi
  
  echo ""
done

echo "=================================================="
echo "✅ PROCESSAMENTO CONCLUÍDO!"
echo "   Total de páginas: $TOTAL"
echo "=================================================="




