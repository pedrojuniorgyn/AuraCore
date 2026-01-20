# 📋 Prompts de Implementação - Módulo Strategic

**Data:** 20/01/2026  
**Versão:** 1.0.0

---

## 📖 Sobre

Esta pasta contém prompts organizados por prioridade para correção do módulo Strategic.
Cada prompt segue o **🔒 PROTOCOLO do regrasmcp.mdc** e pode ser copiado diretamente no Cursor.

---

## 🚀 Ordem de Execução

### Fase 1: Correções Críticas (Semanas 1-2)

| # | Prompt | Descrição | Esforço | Status |
|---|--------|-----------|---------|--------|
| 01 | `PROMPT_01_ACTION_PLANS_NEW.md` | Criar página `/action-plans/new` | 4h | ⏳ Pendente |
| 02 | `PROMPT_02_FIX_KPIS.md` | Fix loading infinito KPIs | 3h | ⏳ Pendente |
| 03 | `PROMPT_03_FIX_SWOT.md` | Fix botões SWOT | 4h | ⏳ Pendente |
| 04 | `PROMPT_04_FIX_WARROOM.md` | Fix layout War Room | 4h | ⏳ Pendente |

### Fase 2: Funcionalidades Core (Semanas 3-4)

| # | Prompt | Descrição | Esforço | Status |
|---|--------|-----------|---------|--------|
| 05 | `PROMPT_05_REACTFLOW.md` | Mapa Estratégico ReactFlow | 8h | ⏳ Pendente |
| 06 | `PROMPT_06_PDCA_DND.md` | PDCA Kanban Drag & Drop | 6h | ⏳ Pendente |
| 07 | `PROMPT_07_CRUD_GOALS.md` | CRUD completo Objetivos | 6h | ⏳ Pendente |
| 08 | `PROMPT_08_CRUD_KPIS.md` | CRUD completo KPIs | 6h | ⏳ Pendente |

### Fase 3: Integrações (Semanas 5-6)

| # | Prompt | Descrição | Esforço | Status |
|---|--------|-----------|---------|--------|
| 09 | `PROMPT_09_FINANCIAL_KPIS.md` | KPIs Financeiros automáticos | 6h | ⏳ Pendente |
| 10 | `PROMPT_10_TMS_KPIS.md` | KPIs TMS (OTD, Custo/Km) | 6h | ⏳ Pendente |
| 11 | `PROMPT_11_WMS_KPIS.md` | KPIs WMS (Acurácia) | 6h | ⏳ Pendente |
| 12 | `PROMPT_12_HEALTH_SCORE.md` | Health Score automático | 4h | ⏳ Pendente |

### Fase 4: War Room (Semanas 7-8)

| # | Prompt | Descrição | Esforço | Status |
|---|--------|-----------|---------|--------|
| 13 | `PROMPT_13_WARROOM_DASHBOARD.md` | Dashboard War Room completo | 6h | ⏳ Pendente |
| 14 | `PROMPT_14_MEETINGS.md` | Sistema de Reuniões | 6h | ⏳ Pendente |
| 15 | `PROMPT_15_AURORA_CHATBOT.md` | Chatbot Aurora AI | 8h | ⏳ Pendente |

---

## 📝 Como Usar

### 1. Copie o conteúdo do prompt

```bash
cat docs/modules/strategic/PROMPTS/PROMPT_01_ACTION_PLANS_NEW.md
```

### 2. Cole no Cursor

Abra o Cursor e cole o conteúdo no chat.

### 3. Aguarde o 🔒 PROTOCOLO

O agente deve executar o ritual de início antes de codificar.

### 4. Valide as entregas

```bash
# TypeScript sem erros
npx tsc --noEmit

# Testes passando
npm test -- --run

# Página renderiza
# Abrir URL no navegador
```

---

## 📋 Template de Prompt

Todos os prompts seguem este template:

```markdown
# 🎯 [TIPO]: [Título]

**URL:** [URL se aplicável]
**Problema:** [Descrição do problema]

---

## Verificações GREP Obrigatórias

```bash
# Comandos grep para verificar estado atual
```

---

## Estrutura a Criar/Modificar

[Descrição da estrutura]

## Implementação

```typescript
// Código de referência
```

---

## Comportamento Esperado

[Lista de comportamentos]

---

(Seguir 🔒 PROTOCOLO do regrasmcp.mdc)
```

---

## 🔗 Links Relacionados

- [README do Módulo](../README.md)
- [Status das Telas](../SCREENS_STATUS.md)
- [Roadmap](../ROADMAP.md)
- [Arquitetura](../ARCHITECTURE.md)
- [Benchmarks](../BENCHMARKS.md)

---

## 📊 Progresso Geral

```
Fase 1: [░░░░░░░░░░] 0/4 (0%)
Fase 2: [░░░░░░░░░░] 0/4 (0%)
Fase 3: [░░░░░░░░░░] 0/4 (0%)
Fase 4: [░░░░░░░░░░] 0/3 (0%)

Total:  [░░░░░░░░░░] 0/15 (0%)
```

---

**Última atualização:** 20/01/2026
