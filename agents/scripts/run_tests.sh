#!/bin/bash
# agents/scripts/run_tests.sh
# Script para executar testes do AuraCore Agents

set -e

echo "🧪 Executando testes do AuraCore Agents"
echo "========================================"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Verificar se pytest está instalado
if ! command -v pytest &> /dev/null; then
    echo -e "${YELLOW}Instalando pytest...${NC}"
    pip install pytest pytest-asyncio pytest-mock pytest-cov
fi

# Opções (podem ser passadas como variáveis de ambiente)
COVERAGE=${COVERAGE:-false}
MARKERS=${MARKERS:-"unit"}
VERBOSE=${VERBOSE:-true}
FAIL_FAST=${FAIL_FAST:-false}

# Mostrar configuração
echo ""
echo "Configuração:"
echo "  COVERAGE: $COVERAGE"
echo "  MARKERS: $MARKERS"
echo "  VERBOSE: $VERBOSE"
echo "  FAIL_FAST: $FAIL_FAST"
echo ""

# Construir comando
CMD="pytest"

if [ "$VERBOSE" = true ]; then
    CMD="$CMD -v"
fi

if [ "$COVERAGE" = true ]; then
    CMD="$CMD --cov=src --cov-report=term-missing --cov-report=html"
fi

if [ "$MARKERS" != "all" ]; then
    CMD="$CMD -m $MARKERS"
fi

if [ "$FAIL_FAST" = true ]; then
    CMD="$CMD -x"
fi

# Executar
echo "Comando: $CMD"
echo ""
echo "----------------------------------------"

$CMD

EXIT_CODE=$?

echo ""
echo "----------------------------------------"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Todos os testes passaram!${NC}"
else
    echo -e "${RED}❌ Alguns testes falharam${NC}"
fi

# Se coverage foi gerado, mostrar localização
if [ "$COVERAGE" = true ]; then
    echo ""
    echo -e "${YELLOW}📊 Relatório de cobertura gerado em: htmlcov/index.html${NC}"
fi

exit $EXIT_CODE
