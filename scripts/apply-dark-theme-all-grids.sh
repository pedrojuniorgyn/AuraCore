#!/bin/bash

# Script para aplicar tema ESCURO em TODAS as grids
# Tema correto do Monitor de Documentos Fiscais

echo "🌙 APLICANDO TEMA ESCURO EM TODAS AS GRIDS..."
echo ""

# Lista de arquivos com grids
files=(
  "src/app/(dashboard)/configuracoes/backoffice/page.tsx"
  "src/app/(dashboard)/fiscal/ncm-categorias/page.tsx"
  "src/app/(dashboard)/financeiro/radar-dda/page.tsx"
  "src/app/(dashboard)/fiscal/matriz-tributaria/page.tsx"
  "src/app/(dashboard)/financeiro/contas-pagar/page.tsx"
  "src/app/(dashboard)/fiscal/ciap/page.tsx"
  "src/app/(dashboard)/financeiro/centros-custo/page.tsx"
  "src/app/(dashboard)/fiscal/creditos-tributarios/page.tsx"
  "src/app/(dashboard)/configuracoes/filiais/page.tsx"
  "src/app/(dashboard)/tms/repositorio-cargas/page.tsx"
  "src/app/(dashboard)/operacional/sinistros/page.tsx"
  "src/app/(dashboard)/cadastros/produtos/page.tsx"
  "src/app/(dashboard)/gerencial/plano-contas/page.tsx"
  "src/app/(dashboard)/financeiro/remessas/page.tsx"
  "src/app/(dashboard)/tms/ocorrencias/page.tsx"
  "src/app/(dashboard)/financeiro/intercompany/page.tsx"
  "src/app/(dashboard)/operacional/margem-cte/page.tsx"
  "src/app/(dashboard)/gerencial/centros-custo-3d/page.tsx"
  "src/app/(dashboard)/wms/faturamento/page.tsx"
  "src/app/(dashboard)/financeiro/categorias/page.tsx"
  "src/app/(dashboard)/gerencial/dre/page.tsx"
  "src/app/(dashboard)/financeiro/contas-receber/page.tsx"
  "src/app/(dashboard)/cadastros/parceiros/page.tsx"
  "src/app/(dashboard)/financeiro/plano-contas/page.tsx"
  "src/app/(dashboard)/financeiro/impostos-recuperaveis/page.tsx"
  "src/app/(dashboard)/frota/documentacao/page.tsx"
  "src/app/(dashboard)/rh/motoristas/jornadas/page.tsx"
  "src/app/(dashboard)/sustentabilidade/carbono/page.tsx"
  "src/app/(dashboard)/cadastros/filiais/page.tsx"
  "src/app/(dashboard)/frota/veiculos/page.tsx"
  "src/app/(dashboard)/frota/motoristas/page.tsx"
  "src/app/(dashboard)/comercial/cotacoes/page.tsx"
  "src/app/(dashboard)/comercial/tabelas-frete/page.tsx"
)

count=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
    ((count++))
  fi
done

echo ""
echo "📊 Total: $count arquivos encontrados"
echo ""
echo "🎨 Aplicando tema ESCURO (Monitor Fiscal)..."
echo ""


