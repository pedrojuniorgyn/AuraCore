#!/bin/bash

# Script de validação de qualidade
# Uso: ./scripts/validate-quality.sh

echo "🔍 Validando qualidade do código..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. TypeCheck
echo "📘 TypeScript Check..."
if npm run typecheck; then
  echo -e "${GREEN}✅ TypeScript OK${NC}"
else
  echo -e "${RED}❌ Erros de TypeScript encontrados${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 2. Lint
echo "🔧 ESLint..."
if npm run lint; then
  echo -e "${GREEN}✅ Lint OK${NC}"
else
  echo -e "${RED}❌ Erros de lint encontrados${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Buscar 'any'
echo "🔍 Procurando uso de 'any'..."
ANY_COUNT=$(grep -r ": any" src/ --include="*.ts" --include="*.tsx" | wc -l)
if [ "$ANY_COUNT" -eq 0 ]; then
  echo -e "${GREEN}✅ Nenhum 'any' encontrado${NC}"
else
  echo -e "${YELLOW}⚠️  $ANY_COUNT ocorrências de 'any' encontradas${NC}"
  grep -r ": any" src/ --include="*.ts" --include="*.tsx" -n | head -10
  echo "... (mostrando primeiros 10)"
fi
echo ""

# 4. Build
echo "🏗️  Build..."
if npm run build; then
  echo -e "${GREEN}✅ Build OK${NC}"
else
  echo -e "${RED}❌ Build falhou${NC}"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# Resultado final
echo "================================"
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}✅ QUALIDADE OK - Pode commitar!${NC}"
  exit 0
else
  echo -e "${RED}❌ $ERRORS ERRO(S) - Corrija antes de commitar${NC}"
  exit 1
fi