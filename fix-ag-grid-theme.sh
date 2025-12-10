#!/bin/bash

files=(
  "src/app/(dashboard)/financeiro/categorias/page.tsx"
  "src/app/(dashboard)/financeiro/centros-custo/page.tsx"
  "src/app/(dashboard)/financeiro/contas-pagar/page.tsx"
  "src/app/(dashboard)/financeiro/intercompany/page.tsx"
  "src/app/(dashboard)/financeiro/radar-dda/page.tsx"
  "src/app/(dashboard)/financeiro/remessas/page.tsx"
)

for file in "${files[@]}"; do
  echo "🔧 Processando: $file"
  
  # Adicionar classe ag-theme-quartz-dark nos divs que contêm AgGridReact
  sed -i '' 's/<div style={{ height: \(.*\), width: \(.*\), minHeight: \(.*\) }}>/<div style={{ height: \1, width: \2, minHeight: \3 }} className="ag-theme-quartz-dark">/g' "$file"
  
  # Alternativa: divs sem minHeight
  sed -i '' 's/<div style={{ height: \(.*\), width: \(.*\) }}>/<div style={{ height: \1, width: \2 }} className="ag-theme-quartz-dark">/g' "$file"
  
  echo "  ✅ Feito"
done

echo ""
echo "🎉 Todos os arquivos corrigidos!"
