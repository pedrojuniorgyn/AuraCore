# 🚨 ISSUES CRÍTICAS DETALHADAS

## 1. DATABASE: VIOLAÇÃO DE MULTI-TENANCY

As seguintes tabelas foram identificadas sem as colunas obrigatórias `organizationId` e `branchId`. Isso permite que dados de uma empresa sejam acessados por outra se houver falha no filtro de aplicação.

**Arquivos de Schema Afetados:**
- `src/agent/persistence/schemas/agent-messages.schema.ts`
- `src/shared/infrastructure/retention/retention.schema.ts`
- `src/modules/strategic/infrastructure/persistence/schemas/goal-cascade.schema.ts`
- `src/modules/strategic/infrastructure/persistence/schemas/pdca-cycle.schema.ts`
- `src/modules/strategic/infrastructure/persistence/schemas/bsc-perspective.schema.ts`
- `src/modules/strategic/infrastructure/persistence/schemas/action-plan-follow-up.schema.ts`
- `src/modules/strategic/infrastructure/persistence/schemas/kpi-history.schema.ts`

**Ação Necessária:**
1. Adicionar colunas no schema Drizzle.
2. Criar migration SQL.
3. Atualizar Repositories para incluir filtros `.where(and(eq(table.organizationId, ctx.orgId), ...))`.

---

## 2. API: FALTA DE VALIDAÇÃO DE INPUT (ZOD)

A auditoria detectou uma ausência massiva de validação `z.object` nas rotas da API. Abaixo, as áreas mais críticas:

**Módulo WMS (Alto Risco Operacional):**
- `src/app/api/wms/stock/entry/route.ts`
- `src/app/api/wms/stock/exit/route.ts`
- `src/app/api/wms/inventory/route.ts`
*Risco: Corrupção de estoque via API.*

**Módulo Financeiro (Alto Risco Financeiro):**
- `src/app/api/financial/payables/route.ts`
- `src/app/api/financial/receivables/route.ts`
- `src/app/api/financial/bank-transactions/import-ofx/route.ts`
*Risco: Injeção de transações financeiras inválidas.*

**Módulo Fiscal (Risco Legal):**
- `src/app/api/fiscal/documents/[id]/submit/route.ts`
- `src/app/api/fiscal/cte/[id]/authorize/route.ts`
*Risco: Envio de dados incorretos para SEFAZ.*

**Módulo Admin (Risco de Sistema):**
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/permissions/route.ts`
*Risco: Escalada de privilégios.*

**Ação Necessária:**
Implementar schema de validação Zod em TODAS as rotas `POST`, `PUT`, `PATCH`.

```typescript
// Exemplo de correção
const schema = z.object({
  amount: z.number().positive(),
  description: z.string().min(3)
});

const body = await request.json();
const validation = schema.safeParse(body);
if (!validation.success) {
  return NextResponse.json(validation.error, { status: 400 });
}
```

---

## 3. CODE: VIOLAÇÃO DE RESULT PATTERN

O uso de `throw new Error` em entidades de domínio viola o contrato de arquitetura que exige o uso de `Result<T, E>`.

**Contagem:** 11 ocorrências em Domain Entities.

**Ação Necessária:**
Refatorar métodos para retornar `Result.fail('Reason')` ao invés de lançar exceção.
