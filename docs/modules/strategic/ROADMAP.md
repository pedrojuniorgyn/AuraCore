# 🚀 Roadmap de Correção - Módulo Strategic

**Data:** 20/01/2026  
**Prioridade:** 🔴 CRÍTICA  
**Duração Total:** 8 semanas

---

## 📋 Visão Geral

| Fase | Semanas | Foco | Esforço |
|------|---------|------|---------|
| 1 | 1-2 | Correções Críticas (Bloqueadores) | 20h |
| 2 | 3-4 | Funcionalidades Core | 24h |
| 3 | 5-6 | Integrações com Módulos | 24h |
| 4 | 7-8 | War Room e Finalização | 16h |

---

## 🔧 FASE 1: CORREÇÕES CRÍTICAS (Semanas 1-2)

### Semana 1: Correções de Bloqueadores

| Dia | Tarefa | Estimativa | Prompt |
|-----|--------|------------|--------|
| 1 | Criar `/action-plans/new/page.tsx` | 4h | `PROMPTS/PROMPT_01_ACTION_PLANS_NEW.md` |
| 2 | Fix loading infinito KPIs | 3h | `PROMPTS/PROMPT_02_FIX_KPIS.md` |
| 3 | Fix botões SWOT | 4h | `PROMPTS/PROMPT_03_FIX_SWOT.md` |
| 4 | Fix layout War Room | 4h | `PROMPTS/PROMPT_04_FIX_WARROOM.md` |
| 5 | Testes E2E básicos | 4h | - |

### Semana 2: APIs Funcionais

| Dia | Tarefa | Estimativa |
|-----|--------|------------|
| 1-2 | Implementar GET/POST `/objectives` | 6h |
| 3-4 | Implementar GET/POST `/kpis` | 6h |
| 5 | Implementar GET/POST `/action-plans` | 4h |

### Entregas da Fase 1:
- [ ] Página `/strategic/action-plans/new` funcional
- [ ] KPIs carregando sem loading infinito
- [ ] Botões SWOT abrindo modal
- [ ] War Room com layout correto
- [ ] APIs de CRUD básico funcionando

---

## 🔧 FASE 2: FUNCIONALIDADES CORE (Semanas 3-4)

### Semana 3: Visualizações Avançadas

| Dia | Tarefa | Estimativa | Prompt |
|-----|--------|------------|--------|
| 1-2 | Mapa Estratégico (ReactFlow) | 8h | `PROMPTS/PROMPT_05_REACTFLOW.md` |
| 3-4 | PDCA Kanban (Drag & Drop) | 6h | `PROMPTS/PROMPT_06_PDCA_DND.md` |
| 5 | CRUD completo de Goals | 4h | - |

### Semana 4: CRUD Completo

| Dia | Tarefa | Estimativa |
|-----|--------|------------|
| 1-2 | CRUD completo de KPIs | 6h |
| 3-4 | 5W2H formulário completo | 6h |
| 5 | SWOT com persistência | 4h |

### Entregas da Fase 2:
- [ ] Mapa Estratégico com ReactFlow funcionando
- [ ] PDCA Kanban com drag & drop
- [ ] CRUD completo de Objetivos
- [ ] CRUD completo de KPIs
- [ ] Formulário 5W2H completo
- [ ] SWOT com persistência

---

## 🔧 FASE 3: INTEGRAÇÕES (Semanas 5-6)

### Semana 5: Integração Financial

| Dia | Tarefa | Estimativa | Prompt |
|-----|--------|------------|--------|
| 1-2 | KPIs Financeiros automáticos | 6h | `PROMPTS/PROMPT_07_FINANCIAL_KPIS.md` |
| 3-4 | Integração com DRE | 6h | - |
| 5 | Health Score automático | 4h | - |

### Semana 6: Integração TMS/WMS

| Dia | Tarefa | Estimativa |
|-----|--------|------------|
| 1-2 | KPIs TMS (OTD, Custo/Km) | 6h |
| 3-4 | KPIs WMS (Acurácia, Produtividade) | 6h |
| 5 | Alertas automáticos | 4h |

### KPIs a Integrar:

**Financeiros:**
| KPI | Fonte | Cálculo |
|-----|-------|---------|
| EBITDA | DRE | receitaLiquida - custos - despesas |
| Receita Líquida | DRE | receitaBruta - deducoes |
| Margem Bruta % | DRE | (lucroBruto / receitaLiquida) × 100 |
| Custo por KM | TMS + Financial | totalCustos / totalKm |
| Ticket Médio | Financial | receitaTotal / qtdFretes |

**Operacionais (TMS):**
| KPI | Fonte | Cálculo |
|-----|-------|---------|
| OTD (On-Time Delivery) | TMS | entregasNoPrazo / totalEntregas |
| Custo por Entrega | TMS | custoTotal / entregas |
| Ocupação de Frota | TMS | kmRodados / kmDisponivel |
| Tempo Médio de Entrega | TMS | média(tempoEntrega) |

**Armazém (WMS):**
| KPI | Fonte | Cálculo |
|-----|-------|---------|
| Acurácia de Estoque | WMS | (1 - divergencias/total) × 100 |
| Produtividade Picking | WMS | itensSeparados / horasTrabalhadas |
| Tempo de Separação | WMS | média(tempoSeparacao) |

### Entregas da Fase 3:
- [ ] KPIs Financeiros integrados
- [ ] KPIs TMS integrados
- [ ] KPIs WMS integrados
- [ ] Health Score calculado automaticamente
- [ ] Alertas configurados

---

## 🔧 FASE 4: WAR ROOM E FINALIZAÇÃO (Semanas 7-8)

### Semana 7: War Room Completo

| Dia | Tarefa | Estimativa |
|-----|--------|------------|
| 1-2 | Dashboard War Room completo | 6h |
| 3-4 | Sistema de Reuniões | 6h |
| 5 | Atas automáticas | 4h |

### Semana 8: Polish e Testes

| Dia | Tarefa | Estimativa |
|-----|--------|------------|
| 1-2 | Testes E2E completos | 8h |
| 3 | Documentação | 4h |
| 4-5 | Bug fixes e polish | 8h |

### Entregas da Fase 4:
- [ ] Dashboard War Room com Health Score em tempo real
- [ ] Sistema de Reuniões com agendamento
- [ ] Atas automáticas baseadas em desvios
- [ ] Testes E2E passando
- [ ] Documentação atualizada

---

## ✅ Checklist de Validação

Após cada tarefa:

```bash
# 1. TypeScript sem erros
npx tsc --noEmit

# 2. Testes passando
npm test -- --run

# 3. Sem 'any'
grep -r 'as any' src/modules/strategic/

# 4. Página renderiza
# Abrir URL no navegador e verificar

# 5. Funcionalidade opera
# Testar criar/editar/excluir
```

---

## 📊 Métricas de Acompanhamento

### Semana 2 (Fim Fase 1)
| Métrica | Meta |
|---------|------|
| Telas funcionando | 5/9 |
| APIs funcionais | 70% |
| Bugs críticos | 0 |

### Semana 4 (Fim Fase 2)
| Métrica | Meta |
|---------|------|
| Telas funcionando | 8/9 |
| APIs funcionais | 90% |
| CRUD completo | 4 entidades |

### Semana 6 (Fim Fase 3)
| Métrica | Meta |
|---------|------|
| Telas funcionando | 9/9 |
| KPIs integrados | 10+ |
| Dados em tempo real | 100% |

### Semana 8 (Fim Fase 4)
| Métrica | Meta |
|---------|------|
| % Funcionalidades | 100% |
| Testes E2E | 50+ |
| Bugs | 0 críticos |

---

## 🎯 Marcos (Milestones)

| Data | Marco | Critério de Sucesso |
|------|-------|---------------------|
| Semana 2 | MVP Funcional | Todas as páginas carregam dados |
| Semana 4 | Core Completo | CRUD completo, visualizações OK |
| Semana 6 | Integração | KPIs reais de 3 módulos |
| Semana 8 | Release | 100% funcional, testado |

---

**Última atualização:** 20/01/2026
