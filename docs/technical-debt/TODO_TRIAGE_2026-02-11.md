# Triagem de TODOs - 11/02/2026

## Resumo

| Categoria | Qtd | % |
|---|---|---|
| Total de TODOs | 347 | 100% |
| Em testes (manter) | 24 | 7% |
| Em servicos legados (migrar E10.3) | 19 | 5% |
| Em agent module (manter - roadmap separado) | 21 | 6% |
| Em strategic API mock endpoints (issue) | 45 | 13% |
| Em modulos DDD (manter como avisos) | 98 | 28% |
| Em rotas API nao-strategic (issue) | 72 | 21% |
| Em components/hooks/lib (manter) | 68 | 20% |

## Classificacao

### REMOVER (ja resolvidos ou sem valor) - ~15 TODOs

- `src/app/api/departments/tree/route.ts:135,144` - Nao sao TODOs reais, sao comentarios descritivos com "TODOS" (todos os departamentos)
- `src/components/layout/branch-switcher.tsx:53` - Nao e TODO real, e comentario com "TODOS" (todos os recursos)
- `src/app/(dashboard)/financeiro/contas-pagar/page.tsx:38` - Nao e TODO, e "TODOS os modulos"
- `src/app/(dashboard)/financeiro/contas-receber/page.tsx:29` - Nao e TODO, e "TODOS os modulos"
- `src/app/api/admin/check-deleted-documents/route.ts:36` - Nao e TODO, e "TODOS os documentos"
- `src/shared/infrastructure/notifications/NotificationService.ts:402` - Nao e TODO, e comentario sobre metodo legado
- `src/lib/db/schema/accounting.ts:22` - Nao e TODO, e comentario descritivo com "TODOS"

### CONVERTER EM GITHUB ISSUES (trabalho futuro real) - ~120 TODOs

**Issue: Strategic Mock Endpoints** (45 TODOs - P2)
Rotas em `src/app/api/strategic/` que retornam dados mock:
- reports, templates, integrations, comments, onboarding, settings, analytics
- Requer: tabelas no banco, repositories, use cases

**Issue: SEFAZ Real Integration** (~15 TODOs - P1)
- Teste de conexao mTLS, manifestacao, envio CTe/NFe
- Distribuido em fiscal/sefaz routes e services

**Issue: Financial Validations** (~10 TODOs - P2)
- Validacao boleto gerado antes de alterar titulo
- Validacao motorista/veiculo em viagem ativa
- Calculo de pagamento para payables

**Issue: Push Notifications Persistence** (4 TODOs - P3)
- Subscribe/unsubscribe precisam persistir no banco

**Issue: Agent Integrations** (21 TODOs - P3)
- Integracao real com repositorios AuraCore
- Workflows fiscal, TMS, financial, WMS

**Issue: TMS Cockpit KPIs** (5 TODOs - P2)
- Calcular OTD real, graficos, mapa de calor

### DEBITO TECNICO - Robustez (P3, baixa severidade)

**ProcessJobsCommand.ts - handleJobError sem try-catch externo**
- Arquivo: `src/modules/documents/application/commands/ProcessJobsCommand.ts`
- Linhas: 80-86 (fora do try) e 128-132 (dentro do catch)
- Problema: Se `handleJobError()` lancar excecao (ex: DB indisponivel), o erro propaga sem tratamento tanto no bloco `!processor` (L82-86) quanto dentro do `catch` (L131).
- Impacto: Muito baixo. So ocorre se DB estiver completamente fora. Neste cenario toda a execucao de jobs ja esta comprometida.
- Correcao futura: Envolver todo o corpo do `for` em um unico try-catch, ou adicionar try-catch interno em `handleJobError`.
- Detectado: Agent Review Cursor, 11/02/2026
- Prioridade: P3

### MANTER (avisos uteis in-code) - ~212 TODOs

- TODOs com referencia a epicos (E8, E9, E10) - servem de rastreamento
- TODOs em domain services/use cases - gaps de implementacao documentados
- TODOs em testes - cenarios futuros
- TODOs em legados - serao resolvidos na migracao E10.3
