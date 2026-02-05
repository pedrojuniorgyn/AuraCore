# TAREFA: Adicionar Padrão ZOD-REFINE-004 (Date Validation)

**Seguir Regras:** `.cursor/rules/regrasmcp.mdc`

---

## 📋 CONTEXTO

**Bug crítico corrigido:** Action Plans aceitava `startDate >= dueDate` (data integrity issue)

**Correção aplicada:** Validação de ordem de datas em CREATE e UPDATE schemas

**Commit:** d40fd4cf

**Lição aprendida:** LL-ZOD-004

**Objetivo:** Adicionar padrão ZOD-REFINE-004 ao catálogo SMP para prevenir recorrência

---

## 🎯 OBJETIVO

Adicionar padrão **ZOD-REFINE-004: Date Pair Validation Pattern** ao arquivo `docs/mcp/SMP_PATTERNS_CATALOG.md`

---

## 📝 PASSO 1: ADICIONAR PADRÃO

**Localização:** Adicionar após ZOD-REFINE-003 na seção "🔷 ZOD VALIDATION PATTERNS"

### **ZOD-REFINE-004: Date Pair Validation Pattern**

```markdown
### ZOD-REFINE-004: Date Pair Validation Pattern

**Problema:** Schemas com pares de datas (start/end, departure/arrival) podem NÃO validar ordem cronológica

**Impacto:** 🔴 **CRÍTICO** - Data integrity issue (registros inválidos no banco)

**Exemplo de Bug Real:**
```typescript
// ❌ ANTES: API aceitava dados inválidos
const actionPlan = {
  startDate: "2026-12-31",
  dueDate: "2026-01-01"  // Due date ANTES de start date!
}
// ✅ Salvo no banco sem erro → CORRUPÇÃO DE DADOS
```

**Solução:** SEMPRE validar ordem de datas em pares

**Padrão Correto (CREATE):**
```typescript
export const createActionPlanSchema = baseActionPlanSchema
  // Validação 1: Regras de negócio (goalId OU kpiId)
  .refine((data) => data.goalId || data.kpiId, {
    message: "Either goalId or kpiId is required",
    path: ["goalId"],
  })
  // Validação 2: Ordem de datas (CRÍTICO)
  .refine((data) => new Date(data.startDate) < new Date(data.dueDate), {
    message: "Start date must be before due date",
    path: ["dueDate"],
  });
```

**Padrão Correto (UPDATE):**
```typescript
export const updateActionPlanSchema = baseActionPlanSchema
  .partial()
  // Validação condicional: apenas se AMBAS datas estão presentes
  .refine((data) => {
    if (data.startDate !== undefined && data.dueDate !== undefined) {
      return new Date(data.startDate) < new Date(data.dueDate);
    }
    return true; // Se uma das datas está ausente, validação passa
  }, {
    message: "Start date must be before due date",
    path: ["dueDate"],
  });
```

**Anti-Pattern (NUNCA usar):**
```typescript
// ❌ ERRADO: Valida regras de negócio mas esquece validação de datas
export const createTripSchema = baseTripSchema
  .refine((data) => data.vehicleId || data.driverId, {
    message: "Vehicle or driver required"
  });
  // ❌ FALTANDO: validação de plannedStartDate < plannedEndDate
```

**Checklist Obrigatório (Date Pair Validation):**
1. [ ] Identificar TODOS os pares de datas no schema:
   - start/end
   - departure/arrival
   - planned/actual
   - opening/closing
2. [ ] Adicionar `.refine()` no CREATE com validação de ordem
3. [ ] Adicionar `.refine()` condicional no UPDATE (checar `!== undefined`)
4. [ ] Usar `path: ["endDate"]` para indicar qual campo tem erro
5. [ ] Testar com datas inválidas (end < start) → deve rejeitar

**Comando de Auditoria:**
```bash
# Buscar schemas com pares de datas SEM validação .refine()
grep -rn "startDate\|endDate\|plannedDepartureAt\|plannedArrivalAt" src/lib/validation/ | \
  grep -v ".refine"
```

**Casos Comuns:**
| Par de Datas | Validação | Exemplo |
|--------------|-----------|---------|
| startDate, endDate | start < end | Trips, Events, Campaigns |
| startDate, dueDate | start < due | Action Plans, Tasks |
| plannedDepartureAt, plannedArrivalAt | departure < arrival | Logistics |
| openingDate, closingDate | opening < closing | Fiscal Periods |
| birthDate, hireDate | birth < hire | HR |

**Referências:**
- Lição Aprendida: LL-ZOD-004
- Commit: d40fd4cf
- Bug corrigido: Action Plans data integrity issue
- Data: 2026-02-05
- Severidade: CRÍTICA (data corruption)
```

---

## ✅ PASSO 2: ATUALIZAR COMMIT MESSAGE

```bash
git add docs/mcp/SMP_PATTERNS_CATALOG.md
git commit -m "docs(smp): add CRITICAL pattern ZOD-REFINE-004 (Date Pair Validation)

Added ZOD-REFINE-004: Date Pair Validation Pattern

Critical pattern to prevent data integrity issues:
- ALWAYS validate date pairs (start/end, departure/arrival)
- Includes CREATE and UPDATE patterns
- Includes audit command to find violations

References:
- Lição Aprendida: LL-ZOD-004
- Commit: d40fd4cf (bug fix)
- Severity: CRITICAL - prevents data corruption

Prevents recurrence of:
Bug: Action Plans accepted startDate >= dueDate → Invalid records in database

Time: 15 min"
```

**⚠️ Não fazer push sem aprovação explícita**

---

## ✅ PASSO 3: AUDITORIA DE SCHEMAS (OPCIONAL - ALTA PRIORIDADE)

Se aprovado, executar auditoria para encontrar outros schemas vulneráveis:

```bash
cd /Users/pedrolemes/aura_core

# Buscar todos os pares de datas em schemas
grep -rn "Date" src/lib/validation/ | \
  grep -E "startDate|endDate|plannedDepartureAt|plannedArrivalAt|openingDate|closingDate" | \
  cut -d: -f1 | sort -u

# Para cada arquivo, verificar se tem .refine() validando ordem
# Se NÃO tiver, é um bug potencial!
```

**Tempo estimado:** 1h (se houver múltiplos schemas para corrigir)

---

## 📋 CHECKLIST

- [ ] Padrão ZOD-REFINE-004 adicionado ao catálogo
- [ ] Checklist obrigatório incluído
- [ ] Comando de auditoria incluído
- [ ] Tabela de casos comuns incluída
- [ ] Anti-pattern documentado
- [ ] Commit criado
- [ ] Push aguardando aprovação
- [ ] (OPCIONAL) Auditoria executada

---

## 🎯 AGENTE RECOMENDADO

**Usar:** `Claude Sonnet 4.5` (Agent padrão)

**Motivo:**
- Tarefa de documentação
- Não envolve código
- 15 minutos estimados

---

## ⏱️ TEMPO ESTIMADO

- Adicionar padrão: 10 min
- Commit: 1 min
- Auditoria (opcional): 1h
- **Total (sem auditoria):** ~15 min

---

## 🔄 EXECUÇÃO

**Quando executar:** Após deploy das 13 tasks de roles/permissions estar em produção

**Prioridade:** ALTA (documenta bug crítico corrigido)

**Ordem sugerida:**
1. Executar `document-zod-patterns.md` (padrões 001-003)
2. Executar `add-zod-date-pattern.md` (padrão 004 - CRÍTICO)
3. (OPCIONAL) Executar auditoria de schemas
