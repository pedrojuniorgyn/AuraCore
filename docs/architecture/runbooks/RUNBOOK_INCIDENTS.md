# Runbook — Incidentes (produção)

## 1) Triagem rápida (5 min)
- Verificar `GET /api/health`
- Verificar saúde do SQL Server (`SELECT 1`)
- Conferir logs do app (Coolify)
- Conferir erros de auth (401/403) e picos de 500

## 2) Classificação do incidente
- Segurança (admin/webhook)
- Integridade (transação parcial, contábil/financeiro inconsistente)
- Performance (latência p95/p99, timeouts, deadlocks)
- Disponibilidade (DB down, app down)

## 3) Resposta por tipo
### Segurança
- bloquear rota/feature
- revogar segredos/tokens
- coletar evidências (logs)

### Integridade
- identificar transação parcial
- congelar processamento automático (cron/webhooks) se necessário
- aplicar correção idempotente (runbook)

### Performance
- Query Store: identificar regressão
- Extended Events: deadlocks/waits
- aplicar hotfix (índice/paginação) com janela

## 4) Pós-mortem mínimo (registrar)
- Impacto
- Linha do tempo
- Causa raiz
- Correção
- Prevenção (ADR/contrato/teste)
