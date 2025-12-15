# Domínio — Admin

## 1) Escopo
- Gestão de usuários e perfis
- Diagnósticos (read-only)
- Operações (seed/migration/fix/clean) — governadas por runbook

## 2) Invariantes
- Em produção: operação perigosa via HTTP é OFF por padrão.
- Tudo em /api/admin exige RBAC no backend.
- Operações destrutivas exigem:
  - permissão forte
  - segredo operacional
  - bloqueio por ambiente
  - logs de execução

## 3) Categorias
### Admin Produto (HTTP OK em PROD)
- users, roles, invites, acessos

### Admin Diagnóstico (HTTP OK com RBAC)
- check-*, list-*, debug-* (sem dados sensíveis ou com scoping)

### Admin Operacional (Runbook only em PROD)
- seed, migrate, clean, fix índices/FKs

## 4) Permissões sugeridas
- admin.full
- admin.users.manage
- admin.diagnostics.read
- admin.migrations.run
- admin.seeds.run
- admin.maintenance.run

## 5) Observabilidade
- logar execução de qualquer operação admin (quem/quando/o quê)
- alerta para tentativas 401/403 em /api/admin

## 6) Riscos atuais & mitigação
- Endpoints sem gate → Onda 0
