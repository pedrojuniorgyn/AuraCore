# 🔧 AÇÃO CORRETIVA TYPESCRIPT - ELIMINAÇÃO DE `any`

**Data/Hora de Criação:** 2026-01-05 18:00:00 UTC  
**Épico:** E7.12 → Incorporado em E7.13/E7.14  
**Autor:** Claude (Arquiteto Enterprise)  
**Referência:** Relatório de Verificação TypeScript (2026-01-05 11:02:33)

---

## 📌 SUMÁRIO EXECUTIVO

### Problema Identificado

Durante a verificação completa de TypeScript em 2026-01-05, foi identificada uma **discrepância crítica** entre a documentação do E7.10 e a realidade do código:

| Métrica | Documentado (E7.10) | Real (Verificação) | Gap |
|---------|---------------------|-------------------|-----|
| **Erros TSC** | 0 | 0 | ✅ |
| **`any` explícito** | 0 | **398** | ❌ |
| **`as any`** | 0 | **138** | ❌ |
| **@ts-ignore** | 0 | 2 | ⚠️ |
| **ESLint erros** | 0 | **819** | ❌ |
| **Deps Circulares** | 0 | 0 | ✅ |
| **Build** | SUCCESS | SUCCESS | ✅ |

**Total de violações de type safety:** **536 ocorrências de `any`**

### Análise Root Cause

**E7.10 resolveu erros de *compilação* (tsc), mas não abordou erros de *lint* (ESLint).**

- ✅ O código **compila** sem erros TypeScript
- ❌ O código não segue **type safety** (536 `any`)
- ⚠️ 90.5% dos erros ESLint (741/819) são `no-explicit-any`

### Decisão Arquitetural

A limpeza de `any` será **incorporada aos épicos E7.13 e E7.14** (Services e APIs → DDD), não como um épico separado.

**Justificativa:**
- Migração para DDD força tipagem correta
- Reescrever lógica > corrigir `any` em código legado
- Evita trabalho duplicado

---

## 🎯 PLANO DE AÇÃO

### Fase 1: E7.13 - Services → DDD (Semanas 2-4 de Janeiro 2026)

**Objetivo:** Eliminar **~72 `any`** em services legados durante migração para Use Cases DDD.

#### Arquivos Alvo

| Arquivo | `any` | Ação |
|---------|-------|------|
| `src/lib/auth/api-guard.ts` | 31 | Migrar para Use Case `AuthorizeRequest` |
| `src/lib/auth.config.ts` | 6 | Remover @ts-ignore, tipar providers |
| `src/app/api/btg/webhook/route.ts` | 10 | Tipar payload BTG com Zod |
| `src/services/sefaz-service.ts` | ~8 | Migrar para Use Cases SEFAZ |
| `src/services/fiscal-service.ts` | ~7 | Migrar para Use Cases Fiscal |
| `src/services/financial-service.ts` | ~5 | Migrar para Use Cases Financial |
| `src/services/accounting-service.ts` | ~5 | Migrar para Use Cases Accounting |

**Subtotal:** ~72 `any` eliminados

#### Estratégia

1. **Criar Use Cases DDD** que substituem services
2. **Tipar adequadamente** inputs/outputs com interfaces
3. **Usar Zod** para validação de payloads externos (BTG, SEFAZ)
4. **Remover services legados** após migração completa

#### Exemplo: `api-guard.ts`

**Antes (31 `any`):**
```typescript
export function withAuth(handler: any) {
  return async (req: any, res: any) => {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    return handler(req, res);
  };
}
```

**Depois (0 `any`):**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AuthorizeRequestUseCase } from '@/modules/auth/application/use-cases/AuthorizeRequest';

export async function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = await authorizeRequestUseCase.execute({ request: req });
    if (!Result.isOk(result)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(req, result.value);
  };
}
```

---

### Fase 2: E7.14 - APIs → Features (Semanas 5-6 de Janeiro 2026)

**Objetivo:** Eliminar **~464 `any`** em API routes e UI components durante migração para Feature Modules.

#### Arquivos Alvo

| Categoria | `any` | Ação |
|-----------|-------|------|
| **AG Grid Renderers** | ~21 | Tipar `ICellRendererParams<T>` |
| **Pages Dashboard** | ~80 | Tipar props de AG Grid e handlers |
| **API Routes** | ~40 | Tipar handlers com NextRequest/NextResponse |
| **Tests** | ~30 | Tipar mocks e fixtures |
| **Components** | ~293 | Tipar props e handlers |

**Subtotal:** ~464 `any` eliminados

#### Top 10 Arquivos Críticos

1. `src/components/ag-grid/renderers/aurora-renderers.tsx` - **13 `any`**
   - Tipar `ICellRendererParams<RowData>`
   
2. `src/app/(dashboard)/wms/faturamento/page.tsx` - **12 `any`**
   - Tipar `ColDef<InvoiceData>[]`
   
3. `src/app/(dashboard)/fiscal/documentos/page.tsx` - **12 `any`**
   - Tipar `ColDef<FiscalDocumentData>[]`
   
4. `src/app/(dashboard)/fiscal/cte/page.tsx` - **11 `any`**
   - Tipar `ColDef<CTeData>[]`
   
5. `src/app/(dashboard)/tms/ocorrencias/page.tsx` - **10 `any`**
   - Tipar handlers de eventos
   
6. `src/app/(dashboard)/operacional/sinistros/page.tsx` - **9 `any`**
   - Tipar `ColDef<SinistroData>[]`
   
7. `src/lib/ag-grid/cell-renderers.tsx` - **8 `any`**
   - Tipar `ICellRendererParams<T>`
   
8. `src/app/(dashboard)/tms/repositorio-cargas/page.tsx` - **7 `any`**
   - Tipar handlers de AG Grid

#### Estratégia

1. **Criar tipos específicos** para cada domínio (ex: `CTeRowData`, `InvoiceRowData`)
2. **Usar AG Grid types** corretamente: `ICellRendererParams<T>`, `ColDef<T>`
3. **Tipar event handlers** com tipos do Next.js e React
4. **Substituir `any` por `unknown`** quando tipo real é desconhecido + type guards

#### Exemplo: AG Grid Renderer

**Antes (13 `any`):**
```typescript
export const StatusRenderer = (params: any) => {
  const value = params.value;
  const onClick = (e: any) => {
    params.api.deselectAll();
    params.node.setSelected(true);
  };
  return <Badge onClick={onClick}>{value}</Badge>;
};
```

**Depois (0 `any`):**
```typescript
import { ICellRendererParams } from 'ag-grid-community';

interface StatusData {
  status: string;
  id: string;
}

export const StatusRenderer = (params: ICellRendererParams<StatusData>) => {
  const value = params.value;
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    params.api.deselectAll();
    params.node.setSelected(true);
  };
  return <Badge onClick={onClick}>{value}</Badge>;
};
```

---

## 📊 META FINAL

### Evolução Esperada

| Fase | Épico | `any` Inicial | `any` Final | Redução |
|------|-------|---------------|-------------|---------|
| **Atual** | E7.12 | 536 | 536 | 0% |
| **Fase 1** | E7.13 | 536 | 464 | 13% |
| **Fase 2** | E7.14 | 464 | <50 | 91% |
| **Final** | E7.17 | <50 | 0 | 100% |

### Critérios de Sucesso

- ✅ E7.13: Reduzir para **<464 `any`** (eliminar services)
- ✅ E7.14: Reduzir para **<50 `any`** (eliminar APIs legadas)
- ✅ E7.17: Reduzir para **0 `any`** (100% type-safe)

---

## 🔍 DETALHAMENTO POR ARQUIVO

### Top 20 Arquivos com `any`

| # | Arquivo | `any` | Prioridade | Épico |
|---|---------|-------|------------|-------|
| 1 | `src/lib/auth/api-guard.ts` | 31 | 🔴 ALTA | E7.13 |
| 2 | `src/components/ag-grid/renderers/aurora-renderers.tsx` | 13 | 🔴 ALTA | E7.14 |
| 3 | `src/app/(dashboard)/wms/faturamento/page.tsx` | 12 | 🔴 ALTA | E7.14 |
| 4 | `src/app/(dashboard)/fiscal/documentos/page.tsx` | 12 | 🔴 ALTA | E7.14 |
| 5 | `src/app/(dashboard)/fiscal/cte/page.tsx` | 11 | 🔴 ALTA | E7.14 |
| 6 | `src/app/api/btg/webhook/route.ts` | 10 | 🔴 ALTA | E7.13 |
| 7 | `src/app/(dashboard)/tms/ocorrencias/page.tsx` | 10 | 🟡 MÉDIA | E7.14 |
| 8 | `src/app/(dashboard)/operacional/sinistros/page.tsx` | 9 | 🟡 MÉDIA | E7.14 |
| 9 | `src/lib/ag-grid/cell-renderers.tsx` | 8 | 🟡 MÉDIA | E7.14 |
| 10 | `src/app/(dashboard)/tms/repositorio-cargas/page.tsx` | 7 | 🟡 MÉDIA | E7.14 |
| 11 | `src/app/(dashboard)/tms/consulta-cte/page.tsx` | 7 | 🟡 MÉDIA | E7.14 |
| 12 | `src/app/(dashboard)/financial/accounts-payable/page.tsx` | 7 | 🟡 MÉDIA | E7.14 |
| 13 | `src/lib/auth.config.ts` | 6 | 🔴 ALTA | E7.13 |
| 14 | `src/app/(dashboard)/wms/estoque/page.tsx` | 6 | 🟡 MÉDIA | E7.14 |
| 15 | `src/components/forms/DynamicForm.tsx` | 6 | 🟡 MÉDIA | E7.14 |
| 16 | `src/app/(dashboard)/fiscal/nfe-entrada/page.tsx` | 6 | 🟡 MÉDIA | E7.14 |
| 17 | `src/app/(dashboard)/accounting/journal-entries/page.tsx` | 5 | 🟢 BAIXA | E7.14 |
| 18 | `src/services/sefaz-service.ts` | 5 | 🔴 ALTA | E7.13 |
| 19 | `src/services/fiscal-service.ts` | 5 | 🔴 ALTA | E7.13 |
| 20 | `src/app/(dashboard)/financial/dashboard/page.tsx` | 5 | 🟢 BAIXA | E7.14 |

**Total Top 20:** 190 `any` (35% do total)

---

## 📋 PADRÕES DE CORREÇÃO

### Padrão 1: AG Grid Column Definitions

**Antes:**
```typescript
const columns: any[] = [
  { field: 'id', headerName: 'ID' },
  { field: 'name', headerName: 'Nome' },
];
```

**Depois:**
```typescript
interface RowData {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const columns: ColDef<RowData>[] = [
  { field: 'id', headerName: 'ID' },
  { field: 'name', headerName: 'Nome' },
];
```

### Padrão 2: Event Handlers

**Antes:**
```typescript
const handleClick = (e: any) => {
  console.log(e.target.value);
};
```

**Depois:**
```typescript
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
  console.log(e.currentTarget.value);
};
```

### Padrão 3: API Route Handlers

**Antes:**
```typescript
export async function POST(req: any) {
  const body = await req.json();
  return Response.json({ data: body });
}
```

**Depois:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CreateInvoiceSchema = z.object({
  customerId: z.string(),
  amount: z.number().positive(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const input = CreateInvoiceSchema.parse(body);
  
  const result = await createInvoiceUseCase.execute(input);
  
  if (!Result.isOk(result)) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  
  return NextResponse.json({ data: result.value });
}
```

### Padrão 4: Webhook Payloads

**Antes:**
```typescript
export async function POST(req: any) {
  const payload = await req.json();
  // Process payload
}
```

**Depois:**
```typescript
import { z } from 'zod';

const BtgWebhookSchema = z.object({
  event: z.enum(['boleto.paid', 'pix.received']),
  data: z.object({
    id: z.string(),
    amount: z.number(),
    paidAt: z.string().datetime(),
  }),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawPayload = await req.json();
  const payload = BtgWebhookSchema.parse(rawPayload);
  
  await processBtgWebhookUseCase.execute(payload);
  
  return NextResponse.json({ received: true });
}
```

---

## 🚨 REGRAS DE OURO

### SEMPRE Fazer

1. ✅ **Tipar com tipos específicos**, não `any`
2. ✅ **Usar `unknown`** quando tipo é desconhecido + type guards
3. ✅ **Usar Zod** para validar dados externos (APIs, webhooks)
4. ✅ **Tipar AG Grid** com `ColDef<T>`, `ICellRendererParams<T>`
5. ✅ **Tipar event handlers** com tipos React/Next.js

### NUNCA Fazer

1. ❌ **Usar `any`** (use `unknown` ou tipo específico)
2. ❌ **Usar `as any`** (refatore para tipo correto)
3. ❌ **Usar `@ts-ignore`** (corrija o tipo)
4. ❌ **Deixar `any` implícito** (sempre tipar explicitamente)

---

## 📈 MONITORAMENTO

### Métricas a Rastrear

| Métrica | Comando | Meta |
|---------|---------|------|
| `any` explícito | `grep -rn ": any" src --include="*.ts" --include="*.tsx" \| wc -l` | 0 |
| `as any` | `grep -rn "as any" src --include="*.ts" --include="*.tsx" \| wc -l` | 0 |
| `@ts-ignore` | `grep -rn "@ts-ignore" src --include="*.ts" --include="*.tsx" \| wc -l` | 0 |
| ESLint `no-explicit-any` | `npm run lint \| grep "no-explicit-any" \| wc -l` | 0 |

### Verificação Semanal

```bash
#!/bin/bash
echo "=== TYPE SAFETY REPORT ==="
echo "Data: $(date)"
echo ""

ANY_EXPLICIT=$(grep -rn ": any" src --include="*.ts" --include="*.tsx" | wc -l)
ANY_AS=$(grep -rn "as any" src --include="*.ts" --include="*.tsx" | wc -l)
TS_IGNORE=$(grep -rn "@ts-ignore" src --include="*.ts" --include="*.tsx" | wc -l)

echo "any explícito: $ANY_EXPLICIT (meta: 0)"
echo "as any: $ANY_AS (meta: 0)"
echo "@ts-ignore: $TS_IGNORE (meta: 0)"
echo ""
echo "Total: $((ANY_EXPLICIT + ANY_AS + TS_IGNORE))"
```

---

## 📝 REFERÊNCIAS

- **Relatório Original:** Verificação TypeScript (2026-01-05 11:02:33)
- **E7.10 Status:** [E7.10_VALIDACAO_FINAL.md](./E7.10_VALIDACAO_FINAL.md)
- **ADR-0012:** [Full DDD Migration](./architecture/adr/0012-full-ddd-migration.md)
- **ADR-0013:** [Eliminate Hybrid Architecture](./architecture/adr/0013-eliminate-hybrid-architecture.md)
- **MCP ENFORCE-003:** [No Any](../docs/mcp/SYSTEM_GUIDE.md#enforce-003)

---

## ✅ ASSINATURA

**Documento criado por:** Claude (Arquiteto Enterprise)  
**Data/Hora:** 2026-01-05 18:00:00 UTC  
**Épico:** E7.12 - Documentação 100%  
**Status:** ✅ APROVADO

**Próximos Passos:**
1. Incorporar à planning do E7.13 (Semana 2 de Janeiro)
2. Monitorar progresso semanalmente
3. Atualizar este documento com resultados reais

---

*Última atualização: 2026-01-05 18:00:00 UTC*

