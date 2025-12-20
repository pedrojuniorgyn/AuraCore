# Contract — RBAC

## Modelo atual (híbrido)
- Role primária em `users.role` (ex.: ADMIN/USER)
- RBAC relacional: roles/permissions/role_permissions/user_roles

## Regras
1. Frontend usa permissões para UX (mostrar/ocultar), mas:
2. Backend é o enforcement final:
   - Operações sensíveis devem exigir permissão explícita (`withPermission`).
3. Admin endpoints:
   - Gestão (users/roles): permitido em produção com RBAC.
   - Operação (seed/migrate/clean/fix): hard gate + ambiente.

## Slugs sugeridos (núcleo)
- admin.full
- admin.users.manage
- admin.diagnostics.read
- admin.migrations.run
- admin.seeds.run
- audit.read
- audit.run
- audit.migrate
- financial.payables.pay
- financial.remittances.generate
- accounting.journal.post
- accounting.journal.reverse
- tms.trips.manage
- tms.occurrences.manage

## Auditoria (AuditFinDB)
### Objetivo
Permitir acesso às telas do módulo **Auditoria** sem exigir papel ADMIN global, respeitando:
- RBAC (permissões)
- Data scoping por filial (allowedBranches)
- Multi-tenancy no AuditFinDB (quando o schema suportar)

### Permissões
- `audit.read`: listar e visualizar telas de auditoria (contas a pagar/receber auditadas, conciliação/achados, fluxo de caixa auditado, snapshots listagem).
- `audit.run`: executar snapshot (ETL) por tenant/filial.
- `audit.migrate`: aplicar migrações idempotentes no AuditFinDB (ex.: colunas/índices para scoping e performance).

### Observação (enforcement)
Mesmo com permissão, o backend deve aplicar:
- `organizationId` (isolamento) quando `audit_snapshot_runs.organization_id` existir
- scoping por filial quando `audit_snapshot_runs.branch_id` existir:
  - ADMIN vê tudo
  - não-admin vê apenas `allowedBranches`
