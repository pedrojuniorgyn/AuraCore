# 🏛️ Estruturas Organizacionais - Guia de Arquitetura

**Última atualização:** 2026-01-31  
**Autor:** AgenteAura  
**Status:** Referência para desenvolvimento de módulos

---

## 📊 Visão Geral das Estruturas

O AuraCore possui **3 estruturas organizacionais distintas** que servem propósitos diferentes:

```
┌─────────────────────────────────────────────────────────────────────┐
│                   ESTRUTURAS ORGANIZACIONAIS                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   BRANCHES   │    │ DEPARTMENTS  │    │ COST_CENTERS │          │
│  │   (Fiscal)   │    │    (RH)      │    │  (Contábil)  │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  • CNPJ/IE           • Organograma       • DRE                     │
│  • CTe/NFe           • Gestores          • Orçamento               │
│  • SPED              • Funcionários      • Rateio                  │
│  • Obrigações        • eSocial           • Análise                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ BRANCHES (Filiais) - Estrutura Fiscal

### Propósito
Representa estabelecimentos com personalidade jurídica própria (CNPJ).

### Tabela
`branches`

### Usado em
| Módulo | Como usa |
|--------|----------|
| **Fiscal** | Emissão de CTe, NFe, MDFe |
| **SPED** | Escrituração fiscal e contábil |
| **Financeiro** | Contas bancárias por filial |
| **Multi-tenancy** | Filtro obrigatório em todas as queries |

### Campos Chave
- `cnpj`, `ie` (Inscrição Estadual)
- `cep`, `uf`, `municipio`
- `regime_tributario`

---

## 2️⃣ DEPARTMENTS (Departamentos) - Estrutura RH

### Propósito
Representa a estrutura organizacional/hierárquica da empresa.

### Tabela
`departments`

### Estrutura
```sql
departments
├── id, organization_id, branch_id
├── parent_id, level              -- Hierarquia
├── code, name, description
├── manager_user_id               -- Gestor
├── default_cost_center_id        -- Vínculo com CC
└── is_active, deleted_at
```

### Usado em
| Módulo | Como usa |
|--------|----------|
| **Strategic** | Responsável em Action Plans, Ideas |
| **RH** | Lotação de funcionários |
| **eSocial** | Código de setor (S-1005) |
| **Gestão** | Organograma, hierarquia |

### Departamentos Padrão (TCLog)
| Código | Nome |
|--------|------|
| DIR | Diretoria |
| OPER | Operações |
| COMER | Comercial |
| FINAN | Financeiro |
| CONT | Contabilidade |
| RH | Recursos Humanos |
| TI | Tecnologia |
| MANUT | Manutenção |
| LOGIS | Logística |

---

## 3️⃣ COST_CENTERS (Centros de Custo) - Estrutura Contábil

### Propósito
Agrupa despesas/receitas para controle financeiro e gerencial.

### Tabela
`cost_centers`

### Estrutura
```sql
cost_centers
├── id, organization_id, branch_id
├── parent_id, level              -- Hierarquia
├── code, name, description
├── type                          -- Tipo de CC
├── manager_id                    -- Responsável
├── budget_amount                 -- Orçamento
└── is_active, deleted_at
```

### Usado em
| Módulo | Como usa |
|--------|----------|
| **Financeiro** | Classificação de despesas/receitas |
| **Contábil** | Rateio de custos |
| **DRE** | Visão gerencial por CC |
| **Orçamento** | Budget por CC |

### Relação com Departments
- Um Departamento pode ter N Centros de Custo
- `departments.default_cost_center_id` → CC padrão
- Futuramente: tabela `department_cost_centers` para N:N

---

## 🔗 Matriz de Relacionamentos

| Módulo | Branches | Departments | Cost Centers |
|--------|----------|-------------|--------------|
| **Fiscal (CTe/NFe)** | ✅ Principal | ❌ | ❌ |
| **SPED** | ✅ Principal | ❌ | ❌ |
| **RH/eSocial** | ✅ Local trabalho | ✅ Principal | ❌ |
| **Financeiro** | ✅ Caixa/Banco | ❌ | ✅ Principal |
| **Contábil** | ✅ Escrituração | ❌ | ✅ Principal |
| **Orçamento** | ✅ | 🟡 Visão | ✅ Principal |
| **DRE Gerencial** | ✅ Filtro | 🟡 Visão | ✅ Principal |
| **Strategic** | ✅ Filtro | ✅ Responsável | 🟡 Opcional |

**Legenda:**
- ✅ Principal = Obrigatório, estrutura base
- ✅ Filtro = Usado para filtrar dados
- 🟡 Visão/Opcional = Pode ser usado para análise
- ❌ Não usa

---

## 📋 Checklist por Módulo

### Ao implementar módulo FISCAL
- [ ] Usar `branches` para identificar estabelecimento emissor
- [ ] NÃO precisa de `departments` ou `cost_centers`

### Ao implementar módulo FINANCEIRO
- [ ] Usar `cost_centers` para classificar movimentações
- [ ] Usar `branches` para contas bancárias
- [ ] Considerar adicionar `cost_center_id` em lançamentos

### Ao implementar módulo ORÇAMENTO
- [ ] Estrutura base: `cost_centers`
- [ ] Opcional: visão por `departments`
- [ ] Criar tabela `budgets` vinculada a CC

### Ao implementar módulo RH
- [ ] Estrutura base: `departments`
- [ ] Vincular `employees.department_id`
- [ ] Adicionar campos eSocial em `departments`
- [ ] Usar `branches` para local de trabalho

### Ao implementar módulo DRE
- [ ] Agregação principal: `cost_centers`
- [ ] Filtros: `branches`, opcionalmente `departments`
- [ ] Considerar criar views SQL para performance

---

## 🔮 Evolução Futura

### Fase 1: Atual ✅
- `departments` criada
- Vinculada ao Strategic module
- Seed com departamentos padrão

### Fase 2: Orçamento
- Popular `cost_centers`
- Criar vínculo `departments.default_cost_center_id`
- Implementar budget por CC

### Fase 3: RH
- Adicionar campos eSocial em `departments`
- Criar `employees.department_id`
- Implementar organograma visual

### Fase 4: Integração Completa
- Tabela `department_cost_centers` (N:N)
- Views SQL para DRE por departamento
- Dashboard unificado de estrutura organizacional

---

## ⚠️ Regras de Ouro

1. **NUNCA confundir Departamento com Centro de Custo**
   - Departamento = onde as pessoas trabalham
   - Centro de Custo = onde os custos são alocados

2. **NUNCA usar Branch como Departamento**
   - Branch = CNPJ (fiscal)
   - Departamento = setor (RH)

3. **SEMPRE validar multi-tenancy**
   - `organization_id` + `branch_id` em todas as queries

4. **PREFERIR FK sobre campo texto**
   - `department_id` > `department` (string)
   - Permite integridade referencial

---

*Este documento deve ser atualizado conforme novos módulos são desenvolvidos.*
