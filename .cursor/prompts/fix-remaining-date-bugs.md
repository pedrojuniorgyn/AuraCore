# TAREFA: Corrigir Validações de Datas Faltantes

**Seguir Regras:** `.cursor/rules/regrasmcp.mdc`

---

## 📋 CONTEXTO

**Auditoria realizada:** 2026-02-05 00:25 GMT-3

**Bugs encontrados:** 2 arquivos com pares de datas SEM validação

**Severidade:** 
- common-schemas.ts: 🟡 MÉDIA (query filters)
- wms-schemas.ts: 🟠 ALTA (create schemas - data integrity)

---

## 🎯 OBJETIVO

Adicionar validação de ordem de datas em:
1. `src/lib/validation/common-schemas.ts` - dateRangeSchema
2. `src/lib/validation/wms-schemas.ts` - 3 pares de datas

---

## 🔍 PASSO 1: VERIFICAR SCHEMAS

```bash
cd /Users/pedrolemes/aura_core

# Ver dateRangeSchema atual
grep -A 5 "dateRangeSchema" src/lib/validation/common-schemas.ts

# Ver pares de datas no WMS
grep -n -A 2 "expiryDate\|manufacturingDate" src/lib/validation/wms-schemas.ts
grep -n -A 5 "startDate.*endDate" src/lib/validation/wms-schemas.ts
```

---

## 🛠️ PASSO 2: CORREÇÕES

### **Correção 1: common-schemas.ts**

**Localização:** `src/lib/validation/common-schemas.ts` (linha ~30)

**Antes:**
```typescript
export const dateRangeSchema = z.object({
  startDate: z.string().datetime({ message: 'Data inicial inválida (use formato ISO)' }).optional(),
  endDate: z.string().datetime({ message: 'Data final inválida (use formato ISO)' }).optional(),
});
```

**Depois:**
```typescript
export const dateRangeSchema = z
  .object({
    startDate: z.string().datetime({ message: 'Data inicial inválida (use formato ISO)' }).optional(),
    endDate: z.string().datetime({ message: 'Data final inválida (use formato ISO)' }).optional(),
  })
  .refine(
    (data) => {
      // Validar apenas se ambas datas estão presentes
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true; // Se uma está ausente, validação passa
    },
    {
      message: 'Data inicial deve ser anterior ou igual à data final',
      path: ['endDate'],
    }
  );
```

---

### **Correção 2: wms-schemas.ts - Pares Identificados**

**Arquivo:** `src/lib/validation/wms-schemas.ts`

#### **2.1. manufacturingDate / expiryDate (linha ~155)**

**Localizar schema:** `createStockItemSchema` ou similar

**Adicionar validação:**
```typescript
.refine(
  (data) => {
    if (data.manufacturingDate && data.expiryDate) {
      return new Date(data.manufacturingDate) < new Date(data.expiryDate);
    }
    return true;
  },
  {
    message: 'Data de fabricação deve ser anterior à data de validade',
    path: ['expiryDate'],
  }
)
```

#### **2.2. startDate / endDate (queries - linha ~277 e ~311)**

**Schemas:** `queryMovementsSchema` e `queryInventoriesSchema`

**Adicionar validação:**
```typescript
.refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  {
    message: 'Data inicial deve ser anterior ou igual à data final',
    path: ['endDate'],
  }
)
```

---

## ✅ PASSO 3: VALIDAR

```bash
# Build local
npm run build

# Verificar que padrão antigo foi eliminado (deve retornar 0)
grep -c "dateRangeSchema = z\.object" src/lib/validation/common-schemas.ts
# Esperado: 0 (agora deve ter .refine())

# Verificar todas validações adicionadas
grep -c "\.refine" src/lib/validation/wms-schemas.ts
# Deve ter aumentado em 3
```

---

## 📝 PASSO 4: COMMIT

```bash
git add src/lib/validation/common-schemas.ts src/lib/validation/wms-schemas.ts
git commit -m "fix(schemas): add date validation to common and wms schemas

Adds missing date pair validation following ZOD-REFINE-004 pattern.

Bugs corrigidos:
- common-schemas: dateRangeSchema sem validação (startDate/endDate)
- wms-schemas: manufacturingDate/expiryDate sem validação
- wms-schemas: queryMovementsSchema sem validação
- wms-schemas: queryInventoriesSchema sem validação

Validação:
- Valida ordem apenas se AMBAS datas estão presentes
- Retorna true se uma das datas está ausente
- Usa path para indicar campo com erro

Severidade:
- common-schemas: MÉDIA (query filters)
- wms-schemas: ALTA (create schemas - data integrity)

References:
- Lição Aprendida: LL-ZOD-004
- Auditoria: 2026-02-05 00:25 GMT-3
- Pattern: ZOD-REFINE-004

Time: 30 min"
```

**⚠️ Não fazer push sem aprovação explícita**

---

## 📋 CHECKLIST

- [ ] dateRangeSchema corrigido (common-schemas.ts)
- [ ] manufacturingDate/expiryDate validado (wms-schemas.ts)
- [ ] queryMovementsSchema validado (wms-schemas.ts)
- [ ] queryInventoriesSchema validado (wms-schemas.ts)
- [ ] Build passou sem erros
- [ ] Commit criado
- [ ] Push aguardando aprovação

---

## 🎯 AGENTE RECOMENDADO

**Usar:** `Claude Sonnet 4.5` (Agent padrão)

**Motivo:**
- Tarefa simples (adicionar validações)
- Padrão já estabelecido
- 30 minutos estimados

---

## ⏱️ TEMPO ESTIMADO

- Verificar schemas: 5 min
- Adicionar validações: 15 min
- Build + validação: 5 min
- Commit: 2 min
- **Total:** ~30 min

---

## 🔄 EXECUÇÃO

**Quando executar:** AGORA (bugs de data integrity - ALTA prioridade)

**Ordem sugerida:**
1. Corrigir common-schemas.ts (MÉDIA prioridade)
2. Corrigir wms-schemas.ts (ALTA prioridade - 3 correções)
3. Build + commit + aguardar aprovação para push
