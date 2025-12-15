# Contract — Tenant + Branch (multi-tenant + data scoping)

## Fonte de verdade
- O contexto vem da sessão (NextAuth) através de `getTenantContext()`.

## Campos do contexto
- userId: string (UUID)
- organizationId: number
- role: string
- defaultBranchId: number | null
- allowedBranches: number[]
- isAdmin: boolean

## Regras obrigatórias
1. Toda query de negócio filtra por `organizationId` do contexto (nunca do body/query).
2. Se o dado tem `branchId`:
   - Admin: acesso total na organização.
   - Não-admin: `branchId` deve estar em `allowedBranches` → senão 403.
3. `x-branch-id` do frontend é apenas “contexto sugerido”.
   - O backend valida; não confia.
4. Fallback silencioso para branch “1” é proibido em produção.

## Anti-regressão (cheiros)
- Ler `x-branch-id` sem validar `allowedBranches`.
- Selecionar por `id` sem filtrar por `organizationId`.
