#!/bin/bash
# ============================================================
# AURACORE - Frontend Analyzer (Quick Win)
# Detecta problemas comuns em componentes React/Next.js
# ============================================================

set -e

# Cores para output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       AURACORE FRONTEND ANALYZER - QUICK WIN               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

REPORT_FILE="frontend-analysis-report-$(date +%Y%m%d-%H%M%S).md"
TOTAL_ISSUES=0

# Função para contar e reportar
report_section() {
    local title="$1"
    local pattern="$2"
    local search_path="$3"
    local description="$4"
    
    echo -e "${YELLOW}🔍 Analisando: ${title}${NC}"
    
    local results=$(grep -rn "$pattern" "$search_path" 2>/dev/null || true)
    local count=$(echo "$results" | grep -c "." 2>/dev/null || echo "0")
    
    if [ "$count" -gt 0 ] && [ -n "$results" ]; then
        echo -e "${RED}   ❌ Encontrados: $count ocorrências${NC}"
        echo "" >> "$REPORT_FILE"
        echo "## $title" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "**Descrição:** $description" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo "**Ocorrências:** $count" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        echo "$results" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        TOTAL_ISSUES=$((TOTAL_ISSUES + count))
    else
        echo -e "${GREEN}   ✅ Nenhum problema encontrado${NC}"
    fi
}

# Inicializar relatório
echo "# 📊 Relatório de Análise de Frontend - AuraCore" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Data:** $(date '+%Y-%m-%d %H:%M:%S')" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CATEGORIA 1: HANDLERS VAZIOS OU INCOMPLETOS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 1.1 onClick vazio
report_section \
    "onClick Vazio (arrow function)" \
    "onClick={() => {}}" \
    "src/" \
    "Botões com onClick que não fazem nada"

report_section \
    "onClick Vazio (com espaço)" \
    "onClick={() => { }}" \
    "src/" \
    "Botões com onClick vazio (variação com espaço)"

# 1.2 onClick com apenas console.log
report_section \
    "onClick apenas console.log" \
    "onClick={() => console.log" \
    "src/" \
    "Botões que apenas logam no console"

# 1.3 onSubmit vazio
report_section \
    "onSubmit Vazio" \
    "onSubmit={() => {}}" \
    "src/" \
    "Formulários com submit vazio"

# 1.4 onChange vazio
report_section \
    "onChange Vazio" \
    "onChange={() => {}}" \
    "src/" \
    "Inputs com onChange vazio"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CATEGORIA 2: TODOs E PLACEHOLDERS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 2.1 TODO em componentes
report_section \
    "TODO em Componentes" \
    "// TODO" \
    "src/components/" \
    "Marcações TODO pendentes em componentes"

# 2.2 FIXME
report_section \
    "FIXME" \
    "// FIXME" \
    "src/" \
    "Marcações FIXME pendentes"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CATEGORIA 3: CÓDIGO DE DEBUG${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 3.1 debugger
report_section \
    "Debugger Statement" \
    "debugger" \
    "src/" \
    "Statements debugger esquecidos"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CATEGORIA 4: PROBLEMAS DE UI${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 4.1 Botões disabled sem razão clara
report_section \
    "Botões sempre disabled" \
    "disabled={true}" \
    "src/" \
    "Botões permanentemente desabilitados"

# 4.2 Links href="#"
report_section \
    "Links href=#" \
    'href="#"' \
    "src/" \
    "Links que não levam a lugar nenhum"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}CATEGORIA 5: MÓDULO STRATEGIC${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Verificar páginas do módulo strategic
echo -e "${YELLOW}🔍 Analisando: Módulo Strategic${NC}"
if [ -d "src/app/(dashboard)/strategic" ]; then
    STRATEGIC_FILES=$(find "src/app/(dashboard)/strategic" -name "*.tsx" 2>/dev/null || true)
    echo "   Arquivos encontrados:"
    echo "$STRATEGIC_FILES" | while read file; do
        if [ -n "$file" ]; then
            echo "   - $file"
        fi
    done
    
    echo "" >> "$REPORT_FILE"
    echo "## Módulo Strategic - Análise Detalhada" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    # Buscar problemas específicos no strategic
    STRATEGIC_ISSUES=$(grep -rn "onClick={() => {}}\|// TODO\|console.log" "src/app/(dashboard)/strategic/" 2>/dev/null || true)
    if [ -n "$STRATEGIC_ISSUES" ]; then
        echo '```' >> "$REPORT_FILE"
        echo "$STRATEGIC_ISSUES" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
    fi
fi

# ============================================================
# RESUMO FINAL
# ============================================================

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    RESUMO DA ANÁLISE                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "# 📊 Resumo" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "**Total de Issues Detectadas:** $TOTAL_ISSUES" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $TOTAL_ISSUES -gt 0 ]; then
    echo -e "${RED}❌ Total de issues encontradas: $TOTAL_ISSUES${NC}"
    echo ""
    echo -e "${YELLOW}📄 Relatório completo salvo em: ${GREEN}$REPORT_FILE${NC}"
else
    echo -e "${GREEN}✅ Nenhuma issue óbvia encontrada!${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}💡 Dica: Execute 'cat $REPORT_FILE' para ver o relatório completo${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
