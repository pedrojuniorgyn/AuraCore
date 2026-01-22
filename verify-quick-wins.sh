#!/bin/bash

echo "🔍 VERIFICAÇÃO QUICK WINS - INICIANDO..."
echo ""

# TypeScript
echo "1️⃣ TypeScript..."
npx tsc --noEmit && echo "✅ TypeScript: 0 erros" || echo "❌ TypeScript: ERROS"
echo ""

# Wrappers
echo "2️⃣ Wrappers..."
WRAPPERS=$(find src/components -name "*AIWidget.tsx" -type f | wc -l)
echo "Wrappers: $WRAPPERS/12"
[[ $WRAPPERS -eq 12 ]] && echo "✅ OK" || echo "❌ FALTANDO"
echo ""

# Páginas
echo "3️⃣ Páginas..."
PAGES=$(grep -r "AIWidget" src/app/\(dashboard\) --include="*.tsx" 2>/dev/null | wc -l)
echo "Páginas com widget: $PAGES"
[[ $PAGES -ge 56 ]] && echo "✅ OK" || echo "⚠️ VERIFICAR"
echo ""

# FIXED-001
echo "4️⃣ FIXED-001..."
VIOLATIONS=$(grep -A10 "<PageTransition>" src/app/\(dashboard\)/**/*.tsx 2>/dev/null | grep -B5 "AIWidget" | wc -l)
[[ $VIOLATIONS -eq 0 ]] && echo "✅ Nenhuma violação" || echo "❌ $VIOLATIONS violações"
echo ""

# Git
echo "5️⃣ Git..."
git status  "✅ Sincronizado" || echo "⚠️ Mudanças pendentes"
echo ""

# Build
echo "6️⃣ Build..."
npm run build > /tmp/build.log 2>&1 && echo "✅ Build OK" || echo "❌ Build FALHOU"
echo ""

echo "🎉 VERIFICAÇÃO CONCLUÍDA!"
