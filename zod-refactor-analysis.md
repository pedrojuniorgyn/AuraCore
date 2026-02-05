# ANÁLISE DE REFATORAÇÃO ZOD - .partial() + .refine()

**Data:** 2026-02-04
**Root Cause:** Zod não permite `.refine()` antes de `.partial()`

## 📊 RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Arquivos analisados | 6 |
| Arquivos com problema | 3 |
| Schemas com problema | 12 |
| Linhas afetadas | ~60 |

---

## ❌ ARQUIVOS SEM PROBLEMA (3)

1. `src/lib/validators/business-partner.ts`
   - ✅ Usa `.partial()` sem `.refine()` posterior
   
2. `src/lib/validators/branch.ts`
   - ✅ Usa `.partial().extend()` corretamente
   
3. `src/lib/validators/organization.ts`
   - ✅ Usa `.partial()` sem `.refine()` posterior

---

## 🔴 ARQUIVOS COM PROBLEMA (3)

### 1. `src/lib/validation/tms-schemas.ts`

**Schemas afetados:**

| Schema | Linha | Tipo de Problema |
|--------|-------|------------------|
| `createTripSchema` | 163-166 | `.refine()` após `.object()` + usado em `.partial()` (linha 249) |
| `queryTripsSchema` | 278-286 | `.refine()` após `.object()` |

**Impacto:** ALTO - Afeta rotas `/api/tms/trips/*`

---

### 2. `src/lib/validation/wms-schemas.ts`

**Schemas afetados:**

| Schema | Linha | Tipo de Problema |
|--------|-------|------------------|
| `createMovementSchema` | 179-199 | `.refine()` após `.object()` |
| `queryMovementsSchema` | 279-287 | `.refine()` após `.object()` |
| `queryInventoriesSchema` | 313-321 | `.refine()` após `.object()` |

**Impacto:** MÉDIO - Afeta rotas `/api/wms/*`

---

### 3. `src/lib/validation/strategic-schemas.ts`

**Schemas afetados:**

| Schema | Linha | Tipo de Problema |
|--------|-------|------------------|
| `createStrategySchema` | 105-108 | `.refine()` após `.object()` + usado em `.partial()` (linha 219) |
| `createActionPlanSchema` | 163-166 | `.refine()` após `.object()` + usado em `.partial()` (linha 234) |
| `queryGoalsSchema` | 252-260 | `.refine()` após `.object()` |
| `queryKpisSchema` | 272-280 | `.refine()` após `.object()` |
| `queryActionPlansSchema` | 294-302 | `.refine()` após `.object()` |

**Impacto:** ALTO - Afeta rotas `/api/strategic/*`

---

## 🔍 PADRÃO DO PROBLEMA

### Cenário 1: Schema base com .refine() usado em .partial()

```typescript
// ❌ ERRADO (ATUAL)
const createSchema = z.object({...}).refine(...);
const updateSchema = createSchema.partial(); // FALHA!

// ✅ CORRETO (APÓS CORREÇÃO)
const createSchemaBase = z.object({...});
const createSchema = createSchemaBase.refine(...);
const updateSchema = createSchemaBase.partial().refine((data) => {
  if (data.campo !== undefined) {
    return validação;
  }
  return true;
});
```

### Cenário 2: Query schema com .refine()

```typescript
// ❌ ERRADO (ATUAL)
const querySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'startDate deve ser anterior ou igual a endDate', path: ['startDate'] }
);

// ✅ CORRETO (MESMA COISA - já funciona!)
// Query schemas não usam .partial(), então não há problema
// MAS vamos manter consistência movendo .refine() para o final
```

---

## 📋 PLANO DE CORREÇÃO

### PASSO 1: tms-schemas.ts (2 schemas)

1. **createTripSchema + updateTripSchema**
   - Extrair base: `createTripSchemaBase`
   - Aplicar `.refine()` em ambos separadamente
   
2. **queryTripsSchema**
   - Manter como está (já funciona)
   - Ou refatorar para consistência

### PASSO 2: wms-schemas.ts (3 schemas)

1. **createMovementSchema**
   - Complexo: validação condicional por tipo (ENTRY/EXIT/TRANSFER)
   - Manter `.refine()` mas documentar que não usa `.partial()`

2. **queryMovementsSchema + queryInventoriesSchema**
   - Manter como estão (query schemas não usam `.partial()`)

### PASSO 3: strategic-schemas.ts (5 schemas)

1. **createStrategySchema + updateStrategySchema**
   - Extrair base: `createStrategySchemaBase`
   - Aplicar `.refine()` em ambos separadamente

2. **createActionPlanSchema + updateActionPlanSchema**
   - Extrair base: `createActionPlanSchemaBase`
   - Aplicar `.refine()` em ambos separadamente

3. **queryGoalsSchema + queryKpisSchema + queryActionPlansSchema**
   - Manter como estão (query schemas não usam `.partial()`)

---

## ⚠️ OBSERVAÇÃO IMPORTANTE

**O erro de build só ocorre quando:**
1. Schema tem `.refine()` ANTES de `.partial()`
2. OU Schema é usado com `.partial()` em outra linha (ex: `updateSchema = createSchema.partial()`)

**Query schemas não são afetados** porque nunca usam `.partial()`.

**Decisão:**
- Corrigir APENAS schemas que realmente causam erro
- Manter query schemas como estão (funcionam corretamente)
- Foco: createTripSchema, createStrategySchema, createActionPlanSchema

---

## 🎯 TOTAL DE CORREÇÕES REAIS

| Arquivo | Schemas a Corrigir | Prioridade |
|---------|-------------------|------------|
| tms-schemas.ts | 1 (createTripSchema) | ALTA |
| wms-schemas.ts | 0 (createMovementSchema não usa .partial()) | BAIXA |
| strategic-schemas.ts | 2 (createStrategySchema, createActionPlanSchema) | ALTA |

**TOTAL: 3 schemas críticos para corrigir**
