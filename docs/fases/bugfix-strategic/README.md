# ✅ Prompts da Fase BugFix Strategic - CRIADOS

## 📦 Arquivos Gerados

### Localização
```
~/clawd/prompts/fase-bugfix-strategic/
```

### Estrutura Completa

```
fase-bugfix-strategic/
├── README.md                      (6.6 KB) - Overview + tabela tasks + lições
├── INDEX.md                       (3.5 KB) - Navegação + quick start
├── COMANDOS_RAPIDOS.md            (5.1 KB) - Comandos copy/paste
├── task01_pdca_grid_fix.md        (9.2 KB) - PDCA Grid ações funcionais
├── task02_kpis_edit_delete.md     (13.0 KB) - KPIs edit/delete logic
└── task03_followup_i18n.md        (16.4 KB) - Follow-up i18n + timeline

Total: 6 arquivos, ~53.8 KB
```

---

## 📊 Resumo das Tasks

| # | Task | Bug | Complexidade | Tempo | Ferramenta |
|---|------|-----|--------------|-------|------------|
| 01 | PDCA Grid Ações Funcionais | rowSelection deprecado + botões sem função | 🟢 Baixa | 1-1.5h | Cursor AI |
| 02 | KPIs Edit/Delete Logic | Regra de negócio ausente | 🟡 Média | 1.5-2h | Cursor AI |
| 03 | Follow-up i18n + Timeline | Interface em inglês + sem sequência visual | 🟡 Média | 2-3h | Cursor Composer |

**Tempo Total:** 4.5-6.5 horas

---

## 🎯 Como Usar

### Opção 1: Execução Manual (Recomendado)

```bash
# 1. Ler overview
cat ~/clawd/prompts/fase-bugfix-strategic/README.md

# 2. Executar tasks na ordem
cursor ~/clawd/prompts/fase-bugfix-strategic/task01_pdca_grid_fix.md
cursor ~/clawd/prompts/fase-bugfix-strategic/task02_kpis_edit_delete.md
cursor ~/clawd/prompts/fase-bugfix-strategic/task03_followup_i18n.md

# 3. Seguir instruções de cada prompt
# 4. Testar localmente antes de commit
# 5. Aguardar autorização para push
```

### Opção 2: Comandos Rápidos

```bash
# Abrir arquivo de comandos
cat ~/clawd/prompts/fase-bugfix-strategic/COMANDOS_RAPIDOS.md

# Copy/paste direto (GREP, testes, commits)
```

---

## 🔍 Características dos Prompts

Todos os prompts seguem o **padrão estabelecido** (Fase 12):

✅ **Iniciam com:** "Seguir Regras .cursor/rules/regrasmcp.mdc"  
✅ **Finalizam com:** "Não Realizar Push sem ser Autorizado"  
✅ **Estrutura completa:**
- Contexto do bug
- Objetivo claro
- GREP investigação obrigatória
- Implementação passo a passo (código pronto)
- Checklist de integração
- Validação final
- Commit message formatado
- Troubleshooting

---

## 🐛 Bugs que Serão Corrigidos

### ✅ Já Resolvido (Antes Desta Fase)
- **BUG-SWOT-500** - SWOT Edit erro 500 ao salvar (commit e0d8beae)

### 🎯 Esta Fase Resolve

#### 1. BUG-PDCA-GRID (Task 01)
**Problema:**
- AG Grid com warnings de `rowSelection` deprecado
- `paginationPageSize=25` inválido
- Botões "Visualizar" e "Editar" sem event handlers

**Solução:**
- Atualizar `rowSelection` para API v34 (objeto)
- Ajustar `paginationPageSize` para 20
- Criar `ActionsCellRenderer` com onClick

---

#### 2. BUG-KPI-PERMISSIONS (Task 02)
**Problema:**
- TODOS os KPIs aparecem sem botões Edit/Delete
- Regra de negócio não implementada

**Regra de Negócio:**
```
PODE editar/deletar:
- KPI standalone (goalId === null)
- KPI não vinculado (linkedModuleId === null)
- KPI manual (dataSource === 'manual')

NÃO PODE editar/deletar:
- KPI derivado de Goal
- KPI vinculado a módulo
- KPI com fonte integrada
```

**Solução:**
- Função `canEditDelete()` com validação
- Componente `KPIActions` condicional
- Tooltip explicativo quando botões não aparecem

---

#### 3. BUG-FOLLOWUP-I18N (Task 03)
**Problema:**
- Formulário de follow-up todo em inglês
- Não mostra sequência lógica dos follow-ups

**Solução:**
- Traduzir labels, placeholders, mensagens para PT-BR
- Criar componente `FollowUpTimeline.tsx`
- Exibir sequência visual (1, 2, 3...) com status e progresso
- Integrar timeline na página de action plan

---

## 📝 Código Pronto Incluído

Cada prompt contém **código completo** pronto para copy/paste:

### Task 01 - PDCA Grid
- ✅ Config AG Grid atualizada (rowSelection objeto)
- ✅ ActionsCellRenderer completo com useRouter
- ✅ Coluna de ações com pinned="right"

### Task 02 - KPIs
- ✅ Função `canEditDelete()` com lógica de negócio
- ✅ Função `getDisabledReason()` para mensagens
- ✅ Componente `KPIActions` com Tooltip
- ✅ Integração na Table/Grid

### Task 03 - Follow-up
- ✅ Labels PT-BR completos
- ✅ Status options traduzidos
- ✅ Componente `FollowUpTimeline.tsx` (16KB de código)
- ✅ Integração na página de action plan
- ✅ Empty state quando não há follow-ups

---

## ✅ Validação e Testes

Cada prompt inclui seção completa de **validação**:

```bash
# TypeScript
npx tsc --noEmit

# ESLint
npm run lint

# Dev server
npm run dev

# Testes manuais no navegador
# Checklist de comportamento esperado
```

---

## 📚 Documentação Relacionada

Criada anteriormente (hoje):

1. **BUG_ANALYSIS_STRATEGIC_UI.md**  
   - Análise técnica dos 4 bugs
   - Investigação GREP detalhada

2. **STRATEGIC_BUGS_ACTION_PLAN.md**  
   - Plano de ação executivo
   - Código de correção inline

3. **BUG_SWOT_500_RESOLUTION.md**  
   - Resolução do bug SWOT (já aplicado)
   - Lições L018 e L019

---

## 🚀 Próximos Passos

### Agora (Executar Tasks)

```bash
# 1. Executar Task 01
cursor ~/clawd/prompts/fase-bugfix-strategic/task01_pdca_grid_fix.md

# 2. Executar Task 02
cursor ~/clawd/prompts/fase-bugfix-strategic/task02_kpis_edit_delete.md

# 3. Executar Task 03
cursor ~/clawd/prompts/fase-bugfix-strategic/task03_followup_i18n.md
```

### Validação

```bash
# Após cada task:
npm run dev
# Testar funcionalidade manualmente
# Criar commit
```

### Deploy

```bash
# Após aprovação dos 3 commits:
git push origin main

# Aguardar Coolify (3-5min)
# Validar em produção
```

---

## 🎓 Padrão Aplicado

Todos os prompts seguem **exatamente** o padrão das Fases 9 e 12:

✅ Início: "Seguir Regras .cursor/rules/regrasmcp.mdc"  
✅ GREP obrigatório no início  
✅ Código pronto (não pseudocódigo)  
✅ Checklist de integração  
✅ Commit message formatado  
✅ Troubleshooting  
✅ Final: "Não Realizar Push sem ser Autorizado"  

---

## 📊 Estatísticas

- **Arquivos criados:** 6 prompts + 4 docs de análise = **10 arquivos**
- **Tamanho total:** ~90 KB de documentação
- **Bugs identificados:** 4 (1 resolvido, 3 nesta fase)
- **Tempo total estimado:** 4.5-6.5 horas
- **Tempo de criação dos prompts:** ~2 horas

---

## ✅ Status

**Fase BugFix Strategic:** ✅ **PROMPTS PRONTOS**  
**Bugs Resolvidos:** 1/4 (SWOT-500)  
**Bugs Pendentes:** 3/4 (Tasks 01-03)  
**Próximo Passo:** Executar tasks

---

**Tudo pronto para execução! 🚀**
