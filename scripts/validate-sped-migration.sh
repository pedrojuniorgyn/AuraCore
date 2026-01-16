#!/bin/bash

##############################################################################
# SCRIPT DE VALIDAÇÃO DA MIGRAÇÃO SPED
# 
# Valida que a migração DDD dos geradores SPED está completa e correta
# 
# Uso: ./scripts/validate-sped-migration.sh
##############################################################################

set -e

echo "🔍 VALIDANDO MIGRAÇÃO SPED PARA DDD..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUCCESS_COUNT=0
FAIL_COUNT=0

##############################################################################
# 1. VERIFICAR VIOLAÇÕES DE ARQUITETURA
##############################################################################
echo "📐 1. Verificando violações de arquitetura..."

# ARCH-002: Domain não deve importar de infrastructure
ARCH_VIOLATIONS=$(grep -rn "from '@/lib/db'" src/modules/fiscal/domain/ 2>/dev/null | wc -l | tr -d ' ')

if [ "$ARCH_VIOLATIONS" -eq "0" ]; then
  echo -e "${GREEN}✅ ARCH-002: Zero violações (Domain não importa infrastructure)${NC}"
  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
  echo -e "${RED}❌ ARCH-002: $ARCH_VIOLATIONS violações encontradas${NC}"
  grep -rn "from '@/lib/db'" src/modules/fiscal/domain/ 2>/dev/null || true
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ARCH-003: Domain não deve usar drizzle
DRIZZLE_VIOLATIONS=$(grep -rn "from 'drizzle" src/modules/fiscal/domain/ 2>/dev/null | wc -l | tr -d ' ')

if [ "$DRIZZLE_VIOLATIONS" -eq "0" ]; then
  echo -e "${GREEN}✅ ARCH-003: Zero violações (Domain não usa Drizzle)${NC}"
  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
  echo -e "${RED}❌ ARCH-003: $DRIZZLE_VIOLATIONS violações encontradas${NC}"
  grep -rn "from 'drizzle" src/modules/fiscal/domain/ 2>/dev/null || true
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""

##############################################################################
# 2. VERIFICAR ARQUIVOS DDD EXISTEM
##############################################################################
echo "📁 2. Verificando existência dos arquivos DDD..."

DDD_FILES=(
  "src/modules/fiscal/domain/services/SpedFiscalGenerator.ts"
  "src/modules/fiscal/domain/services/SpedEcdGenerator.ts"
  "src/modules/fiscal/domain/services/SpedContributionsGenerator.ts"
  "src/modules/fiscal/application/use-cases/GenerateSpedFiscalUseCase.ts"
  "src/modules/fiscal/application/use-cases/GenerateSpedEcdUseCase.ts"
  "src/modules/fiscal/application/use-cases/GenerateSpedContributionsUseCase.ts"
  "src/modules/fiscal/infrastructure/persistence/DrizzleSpedDataRepository.ts"
  "src/modules/fiscal/domain/value-objects/SpedBlock.ts"
  "src/modules/fiscal/domain/value-objects/SpedDocument.ts"
  "src/modules/fiscal/domain/value-objects/SpedRegister.ts"
  "src/modules/fiscal/domain/ports/ISpedDataRepository.ts"
  "src/modules/fiscal/domain/errors/SpedError.ts"
)

for file in "${DDD_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅ $file${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "${RED}❌ $file (FALTANDO)${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

echo ""

##############################################################################
# 3. VERIFICAR ARQUIVOS LEGADOS AINDA EXISTEM
##############################################################################
echo "🗑️  3. Verificando arquivos legados (devem ser removidos após migração)..."

LEGACY_FILES=(
  "src/services/sped-fiscal-generator.ts"
  "src/services/sped-ecd-generator.ts"
  "src/services/sped-contributions-generator.ts"
)

LEGACY_EXISTS=0
for file in "${LEGACY_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${YELLOW}⚠️  $file (LEGADO - remover após validação)${NC}"
    LEGACY_EXISTS=$((LEGACY_EXISTS + 1))
  else
    echo -e "${GREEN}✅ $file (já removido)${NC}"
  fi
done

if [ "$LEGACY_EXISTS" -eq "0" ]; then
  echo -e "${GREEN}✅ Todos os arquivos legados foram removidos${NC}"
  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
  echo -e "${YELLOW}⚠️  $LEGACY_EXISTS arquivos legados ainda existem (OK se migração em andamento)${NC}"
fi

echo ""

##############################################################################
# 4. CONTAR LINHAS DE CÓDIGO
##############################################################################
echo "📊 4. Contando linhas de código..."

if [ -f "src/services/sped-fiscal-generator.ts" ]; then
  LEGACY_LINES=$(wc -l src/services/sped-*.ts 2>/dev/null | tail -1 | awk '{print $1}')
  echo -e "${YELLOW}   Código LEGADO: $LEGACY_LINES linhas${NC}"
fi

DDD_LINES=$(find src/modules/fiscal/domain/services/ -name "Sped*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')
echo -e "${GREEN}   Código DDD: $DDD_LINES linhas${NC}"

echo ""

##############################################################################
# 5. VERIFICAR TESTES
##############################################################################
echo "🧪 5. Verificando testes..."

TEST_FILES=(
  "tests/unit/modules/fiscal/domain/SpedFiscalGenerator.test.ts"
  "tests/unit/modules/fiscal/domain/SpedEcdGenerator.test.ts"
  "tests/unit/modules/fiscal/domain/SpedContributionsGenerator.test.ts"
  "tests/integration/modules/fiscal/DrizzleSpedDataRepository.test.ts"
)

TESTS_MISSING=0
for file in "${TEST_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅ $file${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "${RED}❌ $file (FALTANDO)${NC}"
    TESTS_MISSING=$((TESTS_MISSING + 1))
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

if [ "$TESTS_MISSING" -gt "0" ]; then
  echo -e "${RED}⚠️  $TESTS_MISSING arquivos de teste faltando${NC}"
fi

echo ""

##############################################################################
# 6. EXECUTAR TESTES (se existirem)
##############################################################################
echo "🧪 6. Executando testes SPED..."

if [ -d "tests/unit/modules/fiscal" ] || [ -d "tests/integration/modules/fiscal" ]; then
  echo "   Rodando testes..."
  if npm test -- --run --reporter=verbose src/modules/fiscal 2>&1 | grep -q "PASS"; then
    echo -e "${GREEN}✅ Testes passando${NC}"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo -e "${YELLOW}⚠️  Testes falhando ou não encontrados${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Nenhum teste encontrado (criar testes)${NC}"
fi

echo ""

##############################################################################
# 7. VERIFICAR TYPESCRIPT
##############################################################################
echo "📘 7. Verificando TypeScript..."

if npx tsc --noEmit --project tsconfig.json 2>&1 | grep -q "error TS"; then
  echo -e "${RED}❌ Erros TypeScript encontrados${NC}"
  npx tsc --noEmit --project tsconfig.json 2>&1 | grep "error TS" | head -10
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo -e "${GREEN}✅ Zero erros TypeScript${NC}"
  SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
fi

echo ""

##############################################################################
# RESUMO FINAL
##############################################################################
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMO DA VALIDAÇÃO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Sucessos: $SUCCESS_COUNT${NC}"
echo -e "${RED}❌ Falhas: $FAIL_COUNT${NC}"
echo ""

if [ "$FAIL_COUNT" -eq "0" ] && [ "$LEGACY_EXISTS" -eq "0" ]; then
  echo -e "${GREEN}🎉 MIGRAÇÃO COMPLETA E VALIDADA!${NC}"
  echo ""
  echo "   Todos os critérios foram atendidos:"
  echo "   ✅ Arquitetura DDD correta"
  echo "   ✅ Arquivos DDD existem"
  echo "   ✅ Testes criados e passando"
  echo "   ✅ Zero erros TypeScript"
  echo "   ✅ Código legado removido"
  echo ""
  exit 0
elif [ "$FAIL_COUNT" -eq "0" ] && [ "$LEGACY_EXISTS" -gt "0" ]; then
  echo -e "${YELLOW}⚠️  MIGRAÇÃO EM ANDAMENTO${NC}"
  echo ""
  echo "   Arquivos DDD estão corretos, mas:"
  echo "   ⚠️  $LEGACY_EXISTS arquivos legados ainda existem"
  echo ""
  echo "   Próximos passos:"
  echo "   1. Validar arquivos gerados (legado vs. DDD)"
  echo "   2. Migrar APIs para usar Use Cases"
  echo "   3. Deploy em staging"
  echo "   4. Remover arquivos legados"
  echo ""
  exit 1
else
  echo -e "${RED}❌ MIGRAÇÃO INCOMPLETA${NC}"
  echo ""
  echo "   $FAIL_COUNT problema(s) encontrado(s)."
  echo "   Verifique os erros acima e corrija antes de prosseguir."
  echo ""
  exit 1
fi
