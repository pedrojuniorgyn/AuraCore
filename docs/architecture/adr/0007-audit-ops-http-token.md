# ADR 0007 — Auditoria: operações controladas via HTTP com token

## Status
Aceito

## Contexto
O AuraCore possui o módulo **Auditoria** (AuditFinDB) que depende de:
- migrações idempotentes no AuditFinDB (DDL/índices)
- execução de snapshots (ETL) para materializar dados

Em produção, o ADR 0004 define que operações perigosas via HTTP ficam desabilitadas por padrão.
Porém, no caso da Auditoria, é desejável habilitar **automação controlada** (ex.: pipeline/infra) sem acesso SSH, desde que exista autenticação forte e a operação seja idempotente.

## Decisão
Permitir endpoints operacionais do módulo Auditoria via HTTP em produção **somente** quando:
- autenticados por token de infraestrutura (`x-audit-token`) validado contra `AUDIT_SNAPSHOT_HTTP_TOKEN`, **ou**
- executados por usuário autenticado com RBAC apropriado (`audit.migrate`, `audit.run`)

Escopo:
- apenas rotas sob `/api/admin/audit/*` (e rotas auxiliares específicas, quando necessário para evolução de schema)
- operações devem ser idempotentes e seguras para reexecução

## Consequências
- ✅ Habilita automação e execução controlada no Coolify/infra
- ✅ Reduz dependência de SSH/manual
- ⚠️ Aumenta superfície de ataque se o token vazar → exige rotação e segredo bem guardado
- ⚠️ Operação continua exigindo runbook e logs (ver `RUNBOOK_MIGRATIONS_SEEDS.md`)

