#!/bin/bash
# Script para commitar hotfix Fase 6

set -e

echo "========================================="
echo "🚀 Commitando Hotfix Fase 6"
echo "========================================="

# Adicionar testes corrigidos
git add tests/unit/modules/strategic/services/AlertService.test.ts
git add tests/unit/modules/strategic/services/ApprovalWorkflowService.test.ts
git add tests/unit/modules/strategic/services/BudgetImportService.test.ts
git add src/modules/strategic/application/commands/UpdateControlItemValueUseCase.ts

# Adicionar migrations e docs
git add drizzle/migrations/0056_hotfix_add_who_email.sql
git add drizzle/migrations/0057_hotfix_fix_fk_organizations.sql
git add docs/fase6-bugs-analysis.md
git add docs/HOTFIX-FASE6-RUNBOOK.md
git add docs/HOTFIX-FASE6-DIRECT-SERVER.md
git add scripts/validate-hotfix-fase6.sh

echo ""
echo "📝 Arquivos staged:"
git status --short

echo ""
echo "💾 Commitando..."
git commit -m "hotfix(fase6): corrigir schema mismatch e FKs inválidas (BUG-020, BUG-021)

- Adiciona coluna who_email em strategic_action_plan
- Corrige foreign keys organizations → organization  
- Resolve 100% dos erros 500 no módulo Strategic
- Corrige tipos any em testes (ESLint)

Migrations:
- 0056_hotfix_add_who_email.sql
- 0057_hotfix_fix_fk_organizations.sql

Análise completa em docs/fase6-bugs-analysis.md"

echo ""
echo "✅ Commit realizado com sucesso!"
echo ""
echo "🚀 Enviando para origin/main..."
git push origin main

echo ""
echo "========================================="
echo "✅ Hotfix commitado e enviado!"
echo ""
echo "Próximo passo:"
echo "Aguardar Coolify deployar (~5-10min)"
echo "Ou aplicar migrations manualmente no servidor"
echo "========================================="
