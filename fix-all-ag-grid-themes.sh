#!/bin/bash

echo "🚀 Corrigindo TODOS os arquivos com theme={auraTheme}..."
echo ""

# Encontrar todos os arquivos
files=$(grep -rl "theme={auraTheme}" src/app/\(dashboard\) 2>/dev/null)

count=0
for file in $files; do
  count=$((count + 1))
  echo "[$count] 🔧 $file"
  
  # Remover theme={auraTheme}
  sed -i '' 's/theme={auraTheme}//' "$file"
  
  # Adicionar className nos divs com AgGridReact
  sed -i '' 's/<div style={{ height: \(.*\) }}>\([^<]*\)<AgGridReact/<div style={{ height: \1 }} className="ag-theme-quartz-dark">\2<AgGridReact/g' "$file"
  
  echo "    ✅ Corrigido"
done

echo ""
echo "🎉 Total: $count arquivos corrigidos!"
echo ""

# Verificar se ainda tem algum
remaining=$(grep -r "theme={auraTheme}" src/app/\(dashboard\) 2>/dev/null | wc -l)
echo "📊 Verificação: $remaining ocorrências restantes"

