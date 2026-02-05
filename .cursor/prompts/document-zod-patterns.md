# TAREFA: Documentar Padrões Zod no SMP_PATTERNS_CATALOG.md

**Seguir Regras:** `.cursor/rules/regrasmcp.mdc`

---

## 📋 CONTEXTO

**Problema resolvido:** Erro "`.partial() cannot be used on object schemas containing refinements`"

**Solução aplicada:** Refatoração de schemas Zod para inverter ordem `.partial()` + `.refine()`

**Lições aprendidas:** Documentadas em commit `dbdbd286`

**Objetivo:** Adicionar padrões ZOD-REFINE-001, ZOD-REFINE-002, ZOD-REFINE-003 ao catálogo oficial

---

## 🎯 OBJETIVO

Adicionar 3 novos padrões ao arquivo `docs/mcp/SMP_PATTERNS_CATALOG.md`:
- ZOD-REFINE-001: Schema Base Pattern
- ZOD-REFINE-002: Update Schema Validation
- ZOD-REFINE-003: Conditional Refinement

---

## 🔍 PASSO 1: VERIFICAR CATÁLOGO ATUAL

```bash
cd /Users/pedrolemes/aura_core

# Verificar se arquivo existe
ls -la docs/mcp/SMP_PATTERNS_CATALOG.md

# Ver estrutura atual
head -50 docs/mcp/SMP_PATTERNS_CATALOG.md

# Verificar se padrões Zod já existem
grep -i "zod" docs/mcp/SMP_PATTERNS_CATALOG.md
```

**Anotar:**
- [ ] Arquivo existe?
- [ ] Estrutura de seções?
- [ ] Padrões Zod já documentados?

---

## 📝 PASSO 2: ADICIONAR PADRÕES

**Localização:** Adicionar nova seção **"🔷 ZOD VALIDATION PATTERNS"** após seções existentes

### **ZOD-REFINE-001: Schema Base Pattern**

```markdown
### ZOD-REFINE-001: Schema Base Pattern

**Problema:** Zod não permite `.refine()` antes de `.partial()`

**Solução:** Extrair schema base sem `.refine()`, aplicar validações separadamente

**Padrão Correto:**
```typescript
// Base schema (sem refine)
const baseActionPlanSchema = z.object({
  strategyId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
});

// Create schema (com refine)
export const createActionPlanSchema = baseActionPlanSchema
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "Start date must be before end date",
    path: ["endDate"],
  });

// Update schema (partial + refine condicional)
export const updateActionPlanSchema = baseActionPlanSchema
  .partial()
  .refine((data) => {
    // Validar apenas se ambos campos existem
    if (data.startDate !== undefined && data.endDate !== undefined) {
      return new Date(data.startDate) < new Date(data.endDate);
    }
    return true; // Se um campo está ausente, validação passa
  }, {
    message: "Start date must be before end date",
    path: ["endDate"],
  });
```

**Aplicabilidade:**
- ✅ Todos os schemas com `.partial()` + `.refine()`
- ✅ Schemas de create e update em módulos TMS, Strategic, WMS

**Verificação:**
```bash
grep -rn "\.refine(" src/ | grep -B 5 "\.partial()"
# Deve retornar 0 resultados (ordem invertida)
```

**Referências:**
- Lição Aprendida: LL-ZOD-001
- Commit: dbdbd286
- Data: 2026-02-05
```

---

### **ZOD-REFINE-002: Update Schema Validation**

```markdown
### ZOD-REFINE-002: Update Schema Validation

**Problema:** Validações cross-field podem não fazer sentido em updates parciais

**Solução:** Avaliar caso a caso se validação deve ser aplicada em update

**Padrão Correto:**
```typescript
// CREATE: goalId OU kpiId obrigatório
export const createStrategySchema = baseStrategySchema
  .refine((data) => data.goalId || data.kpiId, {
    message: "Either goalId or kpiId is required",
    path: ["goalId"],
  });

// UPDATE: validação NÃO aplicada (parcial pode não ter nenhum dos dois)
export const updateStrategySchema = baseStrategySchema
  .partial();
  // Sem .refine() - permitir updates sem goalId/kpiId
```

**Decisão:** Avaliar se validação cross-field faz sentido em contexto de update parcial

**Casos comuns:**
- ✅ Validação de datas (startDate < endDate) → APLICAR em update
- ❌ Validação "A ou B obrigatório" → NÃO aplicar em update
- ✅ Validação de formato (email, UUID) → APLICAR em update

**Referências:**
- Lição Aprendida: LL-ZOD-002
- Commit: dbdbd286
```

---

### **ZOD-REFINE-003: Conditional Refinement**

```markdown
### ZOD-REFINE-003: Conditional Refinement

**Problema:** Refine em schema parcial precisa checar se campo existe

**Solução:** Sempre usar `if (data.campo !== undefined)` antes de validar

**Padrão Correto:**
```typescript
export const updateTripSchema = baseTripSchema
  .partial()
  .refine((data) => {
    // ✅ SEMPRE verificar undefined ANTES de validar
    if (data.plannedStartDate !== undefined && data.plannedEndDate !== undefined) {
      return new Date(data.plannedStartDate) < new Date(data.plannedEndDate);
    }
    return true; // Campo ausente = validação passa
  }, {
    message: "Planned start date must be before end date",
    path: ["plannedEndDate"],
  });
```

**Anti-Pattern (NUNCA usar):**
```typescript
// ❌ ERRADO: Não verifica undefined
export const updateTripSchema = baseTripSchema
  .partial()
  .refine((data) => {
    // ERRO: data.plannedStartDate pode ser undefined!
    return new Date(data.plannedStartDate) < new Date(data.plannedEndDate);
  });
```

**Regra:** Em schemas com `.partial()`, TODA validação `.refine()` DEVE:
1. Verificar `!== undefined` antes de acessar campo
2. Retornar `true` se campo ausente
3. Validar apenas quando campo existe

**Referências:**
- Lição Aprendida: LL-ZOD-001
- Commit: dbdbd286
```

---

## ✅ PASSO 3: VERIFICAR FORMATAÇÃO

```bash
# Verificar markdown válido
cat docs/mcp/SMP_PATTERNS_CATALOG.md | grep "###"

# Verificar links internos
grep -o "ZOD-REFINE-[0-9]*" docs/mcp/SMP_PATTERNS_CATALOG.md
```

---

## ✅ PASSO 4: COMMIT

```bash
git add docs/mcp/SMP_PATTERNS_CATALOG.md
git commit -m "docs(smp): add Zod validation patterns to catalog

Added 3 new patterns:
- ZOD-REFINE-001: Schema Base Pattern (extract base schema)
- ZOD-REFINE-002: Update Schema Validation (conditional cross-field)
- ZOD-REFINE-003: Conditional Refinement (undefined checks)

References:
- Lição Aprendida: LL-ZOD-001, LL-ZOD-002
- Commit: dbdbd286
- Date: 2026-02-05

Prevents recurrence of:
Error: .partial() cannot be used on object schemas containing refinements

Time: 10 min"
```

**⚠️ Não fazer push sem aprovação explícita**

---

## 📋 CHECKLIST

- [ ] Arquivo `SMP_PATTERNS_CATALOG.md` verificado
- [ ] Seção "🔷 ZOD VALIDATION PATTERNS" adicionada
- [ ] ZOD-REFINE-001 documentado
- [ ] ZOD-REFINE-002 documentado
- [ ] ZOD-REFINE-003 documentado
- [ ] Código de exemplo validado
- [ ] Commit criado
- [ ] Push aguardando aprovação

---

## 🎯 AGENTE RECOMENDADO

**Usar:** `Claude Sonnet 4.5` (Agent padrão)

**Motivo:**
- Tarefa simples (documentação)
- Não envolve código
- 10 minutos estimados

---

## ⏱️ TEMPO ESTIMADO

- Verificar catálogo: 2 min
- Adicionar padrões: 5 min
- Commit: 1 min
- **Total:** ~10 min

---

## 🔄 EXECUÇÃO

**Quando executar:** Após deploy das 13 tasks de roles/permissions estar em produção

**Prioridade:** BAIXA (não bloqueia nada, apenas documentação)
