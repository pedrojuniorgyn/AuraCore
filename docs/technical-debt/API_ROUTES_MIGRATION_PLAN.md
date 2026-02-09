# Plano de Migracao de Rotas API para DDD

**Data:** 2026-02-08
**Origem:** Diagnostico Arquitetural Enterprise - Fase 3
**Status:** EM ANDAMENTO

## Resumo

157+ rotas API acessam o banco de dados diretamente (via Drizzle `db.*` ou `pool.request()`)
ao inves de delegar para Use Cases via Dependency Injection.

## Distribuicao por Modulo

| Modulo | Qtde Rotas | Prioridade | Justificativa |
|--------|-----------|-----------|---------------|
| Financial | 37 | ALTA | Calculo financeiro, multas possiveis |
| Strategic | 23 | MEDIA | Workflow complexo, ja tem Use Cases parciais |
| Fiscal | 21 | CRITICA | Legislacao, multas SEFAZ R$ 5.000+ |
| Admin | 19 | BAIXA | Operacoes internas |
| Other/Shared | 17 | BAIXA | CRUDs simples |
| TMS | 12 | MEDIA | Logistica |
| Fleet | 12 | MEDIA | Frotas |
| Commercial/CRM | 9 | MEDIA | Vendas |
| WMS | 4 | BAIXA | Parcialmente migrado |
| Products | 3 | BAIXA | CRUD simples |

## Estrategia de Migracao

### Fase 1: Rotas Fiscais (Prioridade CRITICA)
- CTe CRUD + authorize/cancel (12 rotas)
- NFe manifest, SEFAZ integration (5 rotas)
- Fiscal settings (1 rota)
- **Estimativa:** 1-2 sprints

### Fase 2: Rotas Financeiras (Prioridade ALTA)
- Payables CRUD + workflow (6 rotas)
- Receivables CRUD + workflow (5 rotas)
- Bank transactions + reconciliation (3 rotas)
- Billing + remittances (8 rotas)
- Reports (DRE, cash flow) (5 rotas)
- **Estimativa:** 2-3 sprints

### Fase 3: Rotas Estrategicas (Prioridade MEDIA)
- Ideas workflow (5 rotas) - ja tem Use Cases parciais
- PDCA workflow (3 rotas)
- Audit + activity (4 rotas)
- **Estimativa:** 1-2 sprints

### Fase 4: Rotas Restantes
- TMS, Fleet, Admin, Commercial, Products, Others
- **Estimativa:** 3-4 sprints

## Padrao de Migracao (Template)

### Antes (Rota Legada)
```typescript
// src/app/api/module/route.ts
import { db } from '@/lib/db';
import { someTable } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const ctx = await getTenantContext();
  const results = await db.select().from(someTable)
    .where(eq(someTable.organizationId, ctx.organizationId));
  return NextResponse.json(results);
}
```

### Depois (Rota com DI)
```typescript
// src/app/api/module/route.ts
import { withDI } from '@/shared/infrastructure/di/with-di';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

export const GET = withDI(
  [TOKENS.ListItemsUseCase],
  async (request, context, listItems) => {
    const ctx = await getTenantContext();
    const result = await listItems.execute({
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
    });
    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.value);
  }
);
```

## Padroes Comuns a Tratar

1. **SSRM Routes:** Server-Side Row Model para AG Grid - criar QueryHandler generico
2. **Raw SQL (pool):** Migrar para Drizzle queries via Repository
3. **Summary/Aggregation:** Criar Query Use Cases especificos
4. **Seed Routes:** Manter como admin utilities (sem migracao)

## Metricas de Progresso

- Total rotas legadas: 157
- Rotas migradas: 0
- Porcentagem: 0%
- Proxima revisao: Sprint E10
