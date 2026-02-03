#!/bin/bash
#
# Script de Reorganização de Documentos - AuraCore
# Versão: 1.0
# Data: 2026-02-03
#
# ATENÇÃO: Revise este script antes de executar!
# Executa movimentação de ~80 arquivos .md da raiz para docs/
#
# Uso: bash reorganizar-docs.sh

set -e  # Exit on error

echo "🔍 Reorganização de Documentos - AuraCore"
echo "=========================================="
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto!"
    exit 1
fi

echo "📂 Criando estrutura de pastas em docs/..."
mkdir -p docs/bugs
mkdir -p docs/setup
mkdir -p docs/fases/bugfix-strategic
mkdir -p docs/fases/redis
mkdir -p docs/fases/tasks
mkdir -p docs/fases/performance
mkdir -p docs/fases/pwa
mkdir -p docs/fases/mobile
mkdir -p docs/relatorios
mkdir -p docs/ag-grid
mkdir -p docs/architecture/e7
mkdir -p docs/misc

echo "✅ Estrutura criada!"
echo ""

#
# BUGS
#
echo "🐛 Movendo bug reports para docs/bugs/..."

mv BUG_FIX_userId.md docs/bugs/BUG-001-userId-schema-mismatch.md 2>/dev/null || true
mv BUG_SWOT_500_RESOLUTION.md docs/bugs/BUG-SWOT-500-entity-payload.md 2>/dev/null || true
mv BUG_FIX_CACHE_INVALIDATION.md docs/bugs/BUG-cache-invalidation.md 2>/dev/null || true
mv BUG_FIX_CONSOLE_LOG.md docs/bugs/BUG-console-log-leak.md 2>/dev/null || true

mv BUG_ANALYSIS_STRATEGIC_UI.md docs/bugs/strategic-ui-analysis.md 2>/dev/null || true
mv STRATEGIC_BUGS_ACTION_PLAN.md docs/bugs/strategic-ui-action-plan.md 2>/dev/null || true

mv BUGFIXES_CONSOLIDATED_FINAL.md docs/bugs/consolidado-final.md 2>/dev/null || true
mv BUGFIXES_CRITICAL_REPORT.md docs/bugs/critical-report.md 2>/dev/null || true
mv BUGFIX_BUG1_BUG2_REPORT.md docs/bugs/bug1-bug2-report.md 2>/dev/null || true
mv BUGFIX_RACE_CONDITION_REPORT.md docs/bugs/race-condition.md 2>/dev/null || true
mv BUGFIX_REPORT.md docs/bugs/bugfix-report.md 2>/dev/null || true
mv BUGFIX_NEXT_PWA_CONFIG.md docs/bugs/next-pwa-config.md 2>/dev/null || true
mv PLAYWRIGHT_MIGRATION_BUGFIX.md docs/bugs/playwright-migration.md 2>/dev/null || true

echo "✅ Bugs movidos!"
echo ""

#
# SETUP
#
echo "⚙️ Movendo guias de setup para docs/setup/..."

mv REDIS_SETUP_FINAL.md docs/setup/redis-setup.md 2>/dev/null || true
mv REDIS_SETUP_COMMANDS.md docs/setup/redis-commands.md 2>/dev/null || true
mv COOLIFY_REDIS_CONFIG.md docs/setup/coolify-redis.md 2>/dev/null || true

mv DIAGNOSTICO_COOLIFY.md docs/setup/diagnostico-coolify.md 2>/dev/null || true
mv COMANDO_RAPIDO_DIAGNOSTICO.md docs/setup/comando-diagnostico.md 2>/dev/null || true
mv REBUILD_STATUS.md docs/setup/rebuild-status.md 2>/dev/null || true

mv INSTRUCOES_MIGRATION_CLASS.md docs/setup/migration-class.md 2>/dev/null || true
mv CORRECAO_IMPORTS_COMPLETA.md docs/setup/correcao-imports.md 2>/dev/null || true
mv RESULTADO_FINAL_CRUD.md docs/setup/crud-resultado.md 2>/dev/null || true

# Renomear .txt para .md
if [ -f "BTG_ENV_VARS.txt" ]; then
    mv BTG_ENV_VARS.txt docs/setup/btg-env-vars.md
fi

echo "✅ Setup guides movidos!"
echo ""

#
# FASES
#
echo "📁 Movendo análises de fases..."

mv PROMPTS_BUGFIX_STRATEGIC_CRIADOS.md docs/fases/bugfix-strategic/README.md 2>/dev/null || true

mv TASK02_CACHE_SERVICE_FINAL.md docs/fases/redis/task02-cache-service.md 2>/dev/null || true
mv TASK02_RELATORIOS_PDF_COMPLETO.md docs/fases/relatorios/task02-pdf.md 2>/dev/null || true

# Tasks
mv TASK02_REPORT.md docs/fases/tasks/task02-report.md 2>/dev/null || true
mv TASK03_REPORT.md docs/fases/tasks/task03-report.md 2>/dev/null || true
mv TASK04_RELATORIO.md docs/fases/tasks/task04-relatorio.md 2>/dev/null || true
mv TASK05_RELATORIO.md docs/fases/tasks/task05-relatorio.md 2>/dev/null || true
mv TASK06_RELATORIO.md docs/fases/tasks/task06-relatorio.md 2>/dev/null || true
mv TASK07_DIAGNOSTICO.md docs/fases/tasks/task07-diagnostico.md 2>/dev/null || true
mv TASK07_SUMMARY.md docs/fases/tasks/task07-summary.md 2>/dev/null || true
mv TASK07_VISUAL_REPORT.md docs/fases/tasks/task07-visual.md 2>/dev/null || true
mv TASK08_FINAL_REPORT.md docs/fases/tasks/task08-final.md 2>/dev/null || true
mv TASK09_FINAL_REPORT.md docs/fases/tasks/task09-final.md 2>/dev/null || true

mv TASKS_01_02_FINAL_REPORT.md docs/fases/tasks/tasks-01-02-final.md 2>/dev/null || true
mv TASKS_07_08_09_CONSOLIDATED_REPORT.md docs/fases/tasks/tasks-07-09-consolidated.md 2>/dev/null || true

mv TASK_01_PERFORMANCE_SUMMARY.md docs/fases/performance/task01-summary.md 2>/dev/null || true
mv TASK_02_PWA_SUMMARY.md docs/fases/pwa/task02-summary.md 2>/dev/null || true
mv TASK_03_MOBILE_RECOMMENDATION.md docs/fases/mobile/task03-recommendation.md 2>/dev/null || true

echo "✅ Fases movidas!"
echo ""

#
# RELATÓRIOS
#
echo "📊 Movendo relatórios executivos..."

mv RELATORIO_CONSOLIDADO_COMPLETO.md docs/relatorios/2026-02-03-consolidado.md 2>/dev/null || true
mv RELATORIO_README.md docs/relatorios/README.md 2>/dev/null || true
mv relatorio-executivo-auracore.html docs/relatorios/2026-02-03-executivo.html 2>/dev/null || true

echo "✅ Relatórios movidos!"
echo ""

#
# PERFORMANCE
#
echo "⚡ Movendo docs de performance..."

mv UX_PERFORMANCE_IMPROVEMENTS.md docs/performance/ux-improvements.md 2>/dev/null || true

echo "✅ Performance docs movidos!"
echo ""

#
# ARCHITECTURE (E7.x)
#
echo "🏗️ Movendo documentos de arquitetura E7.x..."

mv E7.10_BREAKING_CHANGE_WARNING.md docs/architecture/e7/E7.10-breaking-change.md 2>/dev/null || true
mv E7.10_FASE1_TYPESCRIPT_ERRORS_RESOLVED.md docs/architecture/e7/E7.10-fase1-typescript.md 2>/dev/null || true
mv E7.10_FASE2.5_FINAL_REPORT.md docs/architecture/e7/E7.10-fase2.5-final.md 2>/dev/null || true
mv E7.10_FASE2_TESTS_RESOLVED.md docs/architecture/e7/E7.10-fase2-tests.md 2>/dev/null || true
mv E7.10_ISSUE_CRITICA_RESOLVIDA.md docs/architecture/e7/E7.10-issue-critica.md 2>/dev/null || true
mv E7.11_FASE1_MSSQL_SCHEMA_FIXED.md docs/architecture/e7/E7.11-fase1-mssql.md 2>/dev/null || true
mv E7.11_FASE2_AUTH_INTEGRATION_COMPLETE.md docs/architecture/e7/E7.11-fase2-auth.md 2>/dev/null || true
mv E7.12_FASE1_FIX_DUPLICATE_FILES.md docs/architecture/e7/E7.12-fase1-duplicates.md 2>/dev/null || true
mv E7.12_FASE1_RELATORIO.md docs/architecture/e7/E7.12-fase1-relatorio.md 2>/dev/null || true
mv E7.12_FASE2_RELATORIO.md docs/architecture/e7/E7.12-fase2-relatorio.md 2>/dev/null || true
mv E7.12_RELATORIO_CONSOLIDADO.md docs/architecture/e7/E7.12-consolidado.md 2>/dev/null || true
mv E7.13_FINAL_REPORT.md docs/architecture/e7/E7.13-final.md 2>/dev/null || true
mv E7.14_CRIACAO_COMPLETA.md docs/architecture/e7/E7.14-criacao.md 2>/dev/null || true
mv E7.14_FINAL_REPORT.md docs/architecture/e7/E7.14-final.md 2>/dev/null || true
mv E7.14_RELATORIO_FINAL.md docs/architecture/e7/E7.14-relatorio-final.md 2>/dev/null || true
mv E7.15_RELATORIO_FINAL.md docs/architecture/e7/E7.15-final.md 2>/dev/null || true

echo "✅ Arquitetura E7.x movida!"
echo ""

#
# PLANNING
#
echo "📝 Movendo planejamento..."

mv PLANEJAMENTO_AGNO_AURACORE_V2.md docs/planning/agno-auracore-v2.md 2>/dev/null || true
mv frontend-analysis-report-20260120-021632.md docs/planning/frontend-analysis-20260120.md 2>/dev/null || true

echo "✅ Planejamento movido!"
echo ""

#
# AUDIT
#
echo "🔍 Movendo auditoria..."

mv RESUMO_AUDITORIA_SEGURANCA.md docs/audit/resumo-seguranca.md 2>/dev/null || true

echo "✅ Auditoria movida!"
echo ""

#
# TECHNICAL DEBT
#
echo "🛠️ Movendo technical debt..."

# Remover ponto final do nome
if [ -f "CONTEXT_E0.1.md." ]; then
    mv "CONTEXT_E0.1.md." docs/technical-debt/context-e0.1.md
fi

echo "✅ Technical debt movido!"
echo ""

#
# MISC
#
echo "📚 Movendo documentos diversos..."

mv COMO_SALVAR_E_FECHAR_CURSOR.md docs/misc/como-salvar-cursor.md 2>/dev/null || true
mv CONTINUACAO_13_12_2025.md docs/misc/continuacao-13-12-2025.md 2>/dev/null || true

echo "✅ Misc docs movidos!"
echo ""

#
# AG-GRID
#
echo "📊 Movendo docs de AG Grid..."

mv AGGRID_ERRORS_FIX.md docs/ag-grid/errors-fix.md 2>/dev/null || true
mv AGGRID_FIXES_APPLIED.md docs/ag-grid/fixes-applied.md 2>/dev/null || true
mv AGGRID_TRIAL_RESUMO.md docs/ag-grid/trial-resumo.md 2>/dev/null || true

echo "✅ AG Grid docs movidos!"
echo ""

#
# REPORTS (SESSÃO/STATUS)
#
echo "📄 Movendo relatórios de sessão..."

mv RELATORIO_SESSAO_E7.16.md docs/reports/sessao-e7.16.md 2>/dev/null || true
mv RELATORIO_STATUS_AURACORE.md docs/reports/status-auracore.md 2>/dev/null || true

echo "✅ Relatórios de sessão movidos!"
echo ""

#
# DELETAR ARQUIVOS TEMPORÁRIOS
#
echo "🗑️ Deletando arquivos temporários..."

rm -f generate-pdf.js
rm -f build-errors.log
rm -f typecheck-errors.log
rm -f typecheck-output.log
rm -f project-structure.txt

echo "✅ Arquivos temporários deletados!"
echo ""

#
# MOVER ESTE ARQUIVO DE ANÁLISE
#
echo "📋 Movendo análise de reorganização..."

mv ANALISE_REORGANIZACAO_DOCS.md docs/REORGANIZACAO_2026-02-03.md 2>/dev/null || true

echo "✅ Análise movida!"
echo ""

#
# RESUMO
#
echo "=========================================="
echo "✅ Reorganização Concluída!"
echo "=========================================="
echo ""
echo "📊 Resumo:"
echo "  - Arquivos movidos para docs/bugs/"
echo "  - Arquivos movidos para docs/setup/"
echo "  - Arquivos movidos para docs/fases/"
echo "  - Arquivos movidos para docs/relatorios/"
echo "  - Arquivos movidos para docs/architecture/e7/"
echo "  - Arquivos temporários deletados"
echo ""
echo "⚠️ IMPORTANTE:"
echo "  1. Revise as mudanças: git status"
echo "  2. Se estiver OK, commit:"
echo "     git add ."
echo "     git commit -m 'chore: reorganize documentation into docs/ structure'"
echo "  3. Se algo deu errado, desfaça:"
echo "     git reset --hard HEAD"
echo ""
echo "📁 A raiz do projeto agora está limpa!"
echo "📚 Toda documentação está organizada em docs/"
