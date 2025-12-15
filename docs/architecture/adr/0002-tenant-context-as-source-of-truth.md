# ADR 0002 — Tenant Context como fonte de verdade (auth → tenant → branch)

## Status
Aceito

## Contexto
O sistema é multi-tenant e possui scoping adicional por filial. Parte das rotas já usa `getTenantContext()`.

## Decisão
- `getTenantContext()` é a **fonte de verdade** para `organizationId`, `userId`, `role`, `allowedBranches` e `defaultBranchId`.
- Endpoints não devem aceitar `organizationId` do body/query como fonte de verdade.

## Consequências
- Reduz vazamento cross-tenant.
- Simplifica padronização de segurança em rotas de produto e operações.
