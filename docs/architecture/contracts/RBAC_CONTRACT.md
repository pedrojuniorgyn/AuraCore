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
- financial.payables.pay
- financial.remittances.generate
- accounting.journal.post
- accounting.journal.reverse
- tms.trips.manage
- tms.occurrences.manage
