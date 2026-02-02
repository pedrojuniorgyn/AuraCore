# ✅ Fase 6 - Checklist de Validação

**Use este checklist para validar a implementação.**

---

## 🧪 TESTES AUTOMATIZADOS

```bash
cd ~/aura_core

# 1. TypeScript (deve compilar, mas terá 29 warnings pré-existentes)
npx tsc --noEmit

# 2. Testes Unitários (19 testes devem passar)
npm test -- tests/unit/modules/strategic/services/KPICalculatorService.test.ts --run

# 3. Todos os testes do projeto
npm test -- --run
```

- [ ] TypeScript compila (ignorar 29 warnings conhecidos)
- [ ] 19/19 testes KPICalculatorService passam
- [ ] Todos os testes do projeto passam

---

## 🌐 VALIDAÇÃO MANUAL (BROWSER)

```bash
# Subir o servidor
npm run dev
# Abrir: http://localhost:3000
```

### 1. Goal Detail Page (BUG-017 Fix)

**URL:** `/strategic/goals/[uuid]`

- [ ] Página carrega sem 404
- [ ] Mostra: código, descrição, status, período
- [ ] Barra de progresso renderiza
- [ ] Botão "Voltar" funciona

**Como testar:**
1. Ir para `/strategic/goals`
2. Clicar em "Criar Objetivo"
3. Preencher e salvar
4. Após salvar, deve redirecionar para `/strategic/goals/[uuid]` (não 404)

---

### 2. KPI Status Calculation (BUG-018 Fix)

**URL:** `/strategic/kpis/[uuid]`

**Cenários de teste:**

| Cenário | Polarity | Target | Current | Status Esperado |
|---------|----------|--------|---------|-----------------|
| Meta atingida | UP | 100 | 120 | 🟢 GREEN |
| Próximo da meta | UP | 100 | 95 | 🟡 YELLOW |
| Crítico | UP | 100 | 50 | 🔴 RED |
| Meta atingida | DOWN | 10 | 8 | 🟢 GREEN |
| Próximo da meta | DOWN | 10 | 11 | 🟡 YELLOW |
| Crítico | DOWN | 10 | 20 | 🔴 RED |

- [ ] KPI com polarity UP calcula status correto
- [ ] KPI com polarity DOWN calcula status correto
- [ ] Status visual (cor) está correto
- [ ] Percentual de progresso está correto

**Como testar:**
1. Ir para `/strategic/kpis`
2. Clicar em um KPI existente
3. Verificar se status (GREEN/YELLOW/RED) faz sentido
4. Editar valor atual e verificar recálculo

---

### 3. Breadcrumbs Dinâmicos (BUG-019 Fix)

**URLs para testar:**
- `/strategic/goals/[uuid]`
- `/strategic/kpis/[uuid]`
- `/strategic/action-plans/[uuid]`

**Antes:**
```
Dashboard > Gestão Estratégica > Objetivos > 6d8f1234-5678-90ab-cdef-1234567890ab
```

**Depois:**
```
Dashboard > Gestão Estratégica > Objetivos > Aumentar Receita Operacional em 20%
```

- [ ] UUID é substituído por nome amigável
- [ ] Loading state aparece (opacity reduzida)
- [ ] Fallback funciona se API falhar (UUID truncado)
- [ ] Cache funciona (2ª navegação não faz fetch)

**Como testar:**
1. Abrir DevTools > Network
2. Navegar para `/strategic/goals/[uuid]`
3. Ver requisição `GET /api/strategic/goals/[uuid]`
4. Breadcrumb deve mudar de UUID para nome
5. Navegar para outra página e voltar
6. Não deve haver nova requisição (cache)

---

### 4. Workflow de Aprovação (Task 05)

**URL:** `/strategic/workflow` (ou onde estiver)

**Estados do workflow:**
```
DRAFT → PENDING_APPROVAL → APPROVED
                         ↘ REJECTED
```

**Fluxo de teste:**
1. Criar uma versão (DRAFT)
2. Solicitar aprovação (PENDING_APPROVAL)
3. Aprovar/Rejeitar
4. Verificar transições de estado

- [ ] Estado inicial é DRAFT
- [ ] Pode solicitar aprovação
- [ ] Estado muda para PENDING_APPROVAL
- [ ] Pode aprovar (→ APPROVED)
- [ ] Pode rejeitar (→ REJECTED)
- [ ] Estados inválidos são bloqueados

---

### 5. Import CSV Budget (Task 03)

**URL:** `/strategic/import/budget` (ou onde estiver)

**Arquivo de teste:**
```csv
kpiCode,year,month,value
KPI-001,2025,1,1000
KPI-002,2025,1,2000
```

- [ ] Upload aceita arquivo .csv
- [ ] Validação funciona (rejeta CSV inválido)
- [ ] Importação salva no banco
- [ ] Feedback de sucesso/erro é claro

**Como testar:**
1. Criar arquivo `test-budget.csv` com dados acima
2. Fazer upload na interface
3. Verificar mensagem de sucesso
4. Verificar se dados aparecem no dashboard

---

### 6. Drill-down Dashboard (Task 04)

**URL:** `/strategic/dashboard` (ou onde estiver)

- [ ] Cards mostram dados agregados
- [ ] Clicar em card abre drill-down
- [ ] Drill-down mostra detalhes
- [ ] Navegação de volta funciona
- [ ] Filtros aplicam corretamente

---

### 7. Departments Dinâmicos (Task 06)

**URL:** `/strategic/settings/departments` (ou onde estiver)

**Antes:** Lista hardcoded
**Depois:** Lista dinâmica do banco

- [ ] Lista carrega do banco (não hardcoded)
- [ ] Pode criar novo department
- [ ] Pode editar department
- [ ] Pode deletar department (se não tiver filhos)
- [ ] Hierarquia funciona (pai/filho)

---

## 🔍 VALIDAÇÃO DE CÓDIGO

### 1. Lições Aplicadas

```bash
# L-NEW-001: Services no DI
grep -r "container.registerSingleton" src/modules/strategic | wc -l
# Deve retornar > 0

# L-NEW-002: NUNCA new Service()
grep -r "new.*Service(" src/app/api/strategic/ | wc -l
# Deve retornar 0

# L-NEW-004: Proibido as any
grep -r "as any" src/modules/strategic/ | wc -l
# Deve retornar 0
```

- [ ] Services registrados no DI
- [ ] Nenhum `new Service()` em API routes
- [ ] Nenhum `as any` em código strategic

---

### 2. Arquitetura DDD

```bash
# Verificar se Domain Services são stateless
grep -r "private constructor()" src/modules/strategic/domain/services/
```

- [ ] Domain Services têm `private constructor()`
- [ ] Métodos são `static`
- [ ] Retornam `Result<T, E>`

---

## 📊 MÉTRICAS DE SUCESSO

Ao final da validação:

- [ ] 0 bugs críticos encontrados
- [ ] 0 erros de renderização
- [ ] 0 erros de navegação
- [ ] UX é "executiva" (sem UUIDs, mensagens claras)
- [ ] Performance é aceitável (<2s load time)

---

## ❌ RED FLAGS (PARE E REPORTE)

Se encontrar qualquer um destes, **PARE** e reporte:

- 🚨 Erro 500 em qualquer API
- 🚨 Página branca (componente quebrado)
- 🚨 Workflow travado (não muda estado)
- 🚨 Dados não salvam no banco
- 🚨 Importação CSV corrupta dados

---

## ✅ APROVAÇÃO FINAL

**Critérios para aprovar:**

- [ ] Todos os testes automatizados passam
- [ ] Todos os cenários de browser testados
- [ ] 0 bugs críticos encontrados
- [ ] Performance aceitável
- [ ] UX executiva validada

**Se TODOS marcados:** ✅ **APROVADO PARA PRODUÇÃO**

**Se algum falhar:** ⚠️ **CORRIGIR ANTES DE PRODUÇÃO**

---

**Tempo estimado de validação:** 1-2 horas

**Data:** _______________  
**Testado por:** _______________  
**Status:** ☐ Aprovado  ☐ Corrigir  ☐ Bloqueado

---

**Próximo passo:** `FASE6_PROXIMOS_PASSOS.md`
