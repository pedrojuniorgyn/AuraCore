# Padrões de API (Next.js Route Handlers)

## Autenticação e tenant
- Use `getTenantContext` (`src/lib/auth/context.ts`) em todas as rotas protegidas.
- `organizationId` e `branchId` são obrigatórios para consultas/mutações; filtros devem estar em TODAS as operações (incluindo UPDATE/DELETE).
- Para soft delete, inclua `isNull(deletedAt)` no WHERE.

## Validação
- Path/query: valide UUID ou inteiro positivo antes de usar; retorne 400 em caso inválido.
- Body: parse com safeJson e valide com Zod; retorne 400 com detalhes simples.
- TOCTOU: condições de status/tenant devem estar no WHERE da operação que altera estado.

## Respostas padrão
- 401: usuário sem sessão/tenant.
- 400: dados inválidos.
- 404: recurso não encontrado para o tenant ou já deletado.
- 500: erro interno sem expor stack/SQL.

## Multi-tenant (Drizzle)
- Sempre use `and(eq(id,...), eq(organizationId,...), eq(branchId,...), isNull(deletedAt))`.
- Nunca atualize/delete apenas por `id`.

## Observabilidade
- Logue erros com contexto (rota, userId, orgId, branchId) sem expor dados sensíveis.
- Se requestId/correlation estiver disponível, inclua no log.

## Testes mínimos
- Para endpoints críticos: 1 caso feliz, 1 inválido (400), 1 cross-tenant (404/403 conforme padrão).

## Convenções adicionais
- Preferir soft delete quando a tabela possuir `deletedAt`.
- Em respostas de lista, considerar paginação e filtros por tenant (branch/organization).
- Não retornar campos sensíveis em 500/400.
