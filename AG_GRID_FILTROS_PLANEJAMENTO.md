# 🔍 AG GRID - PLANEJAMENTO DE FILTROS AVANÇADOS

**Data:** 09/12/2025  
**Solicitação:** Filtros por coluna com auto-complete e dropdown de valores

---

## 📊 **TIPOS DE FILTROS - DEMONSTRAÇÃO**

### **1. SET FILTER (Mais Usado)**

**Como funciona:**
1. Clica no ícone de filtro na coluna
2. Abre um dropdown com **todos os valores únicos** da coluna
3. Checkbox para selecionar múltiplos valores
4. Search box no topo para filtrar a lista
5. Botões: Selecionar Tudo, Limpar

**Exemplo visual:**
```
┌─────────────────────────────────┐
│ 🔍 Pesquisar...                 │
├─────────────────────────────────┤
│ ☑ Selecionar Tudo              │
├─────────────────────────────────┤
│ ☑ OPEN (15)                    │
│ ☑ PAID (8)                     │
│ ☐ OVERDUE (3)                  │
│ ☐ CANCELLED (2)                │
├─────────────────────────────────┤
│ [Limpar] [Aplicar]             │
└─────────────────────────────────┘
```

**Código:**
```typescript
{
  field: "status",
  headerName: "Status",
  filter: "agSetColumnFilter", // ✅ Set Filter
  filterParams: {
    values: ['OPEN', 'PAID', 'OVERDUE', 'CANCELLED'], // Valores fixos
    // OU
    values: (params) => {
      // Valores dinâmicos da coluna
      const allValues = params.success([...new Set(allData.map(row => row.status))]);
      return allValues;
    },
    buttons: ['apply', 'reset'],
    closeOnApply: true,
  },
}
```

---

### **2. TEXT FILTER (Digitação Livre)**

**Como funciona:**
1. Clica no ícone de filtro
2. Dropdown com opções: Contém, Igual, Começa com, etc.
3. Campo de texto para digitar
4. Filtra conforme digita (ou ao clicar Aplicar)

**Exemplo visual:**
```
┌─────────────────────────────────┐
│ Tipo de filtro:                 │
│ [Contém ▼]                      │
├─────────────────────────────────┤
│ 🔍 Digite para filtrar...       │
│ [_________________________]     │
├─────────────────────────────────┤
│ [Limpar] [Aplicar]             │
└─────────────────────────────────┘
```

**Código:**
```typescript
{
  field: "partnerName",
  headerName: "Fornecedor",
  filter: "agTextColumnFilter", // ✅ Text Filter
  filterParams: {
    filterOptions: [
      'contains',      // Contém
      'notContains',   // Não contém
      'equals',        // Igual a
      'notEqual',      // Diferente de
      'startsWith',    // Começa com
      'endsWith',      // Termina com
    ],
    defaultOption: 'contains',
    buttons: ['apply', 'reset'],
    closeOnApply: true,
    debounceMs: 500, // Aguarda 500ms após parar de digitar
  },
}
```

---

### **3. NUMBER FILTER (Números)**

**Como funciona:**
1. Clica no filtro
2. Dropdown: Igual, Maior que, Menor que, Entre, etc.
3. Campo numérico

**Exemplo visual:**
```
┌─────────────────────────────────┐
│ Tipo de filtro:                 │
│ [Maior que ▼]                   │
├─────────────────────────────────┤
│ Valor:                          │
│ [1000.00_________________]      │
├─────────────────────────────────┤
│ [Limpar] [Aplicar]             │
└─────────────────────────────────┘
```

**Código:**
```typescript
{
  field: "amount",
  headerName: "Valor",
  filter: "agNumberColumnFilter", // ✅ Number Filter
  filterParams: {
    filterOptions: [
      'equals',
      'notEqual',
      'lessThan',
      'lessThanOrEqual',
      'greaterThan',
      'greaterThanOrEqual',
      'inRange',
    ],
    defaultOption: 'greaterThan',
    buttons: ['apply', 'reset'],
  },
}
```

---

### **4. DATE FILTER (Datas)**

**Como funciona:**
1. Clica no filtro
2. Dropdown: Igual, Antes de, Depois de, Entre
3. Date picker

**Exemplo visual:**
```
┌─────────────────────────────────┐
│ Tipo de filtro:                 │
│ [Entre ▼]                       │
├─────────────────────────────────┤
│ Data Início:                    │
│ [📅 01/12/2025]                 │
│ Data Fim:                       │
│ [📅 31/12/2025]                 │
├─────────────────────────────────┤
│ [Limpar] [Aplicar]             │
└─────────────────────────────────┘
```

**Código:**
```typescript
{
  field: "dueDate",
  headerName: "Vencimento",
  filter: "agDateColumnFilter", // ✅ Date Filter
  filterParams: {
    filterOptions: [
      'equals',
      'notEqual',
      'lessThan',      // Antes de
      'greaterThan',   // Depois de
      'inRange',       // Entre
    ],
    buttons: ['apply', 'reset'],
    comparator: (filterDate, cellValue) => {
      const cellDate = new Date(cellValue);
      if (cellDate < filterDate) return -1;
      if (cellDate > filterDate) return 1;
      return 0;
    },
  },
}
```

---

## 🎯 **ADVANCED FILTER PANEL (Sidebar)**

**Como funciona:**
1. Painel lateral com TODOS os filtros
2. Combinar múltiplos filtros com AND/OR
3. Salvar filtros favoritos

**Exemplo visual:**
```
┌─────────────────────────────────┐
│ 🔍 FILTROS AVANÇADOS            │
├─────────────────────────────────┤
│ Status:                         │
│ ☑ OPEN ☑ OVERDUE               │
├─────────────────────────────────┤
│ Fornecedor:                     │
│ [Contém: "Transportes"____]    │
├─────────────────────────────────┤
│ Valor:                          │
│ [Maior que: 1000___________]    │
├─────────────────────────────────┤
│ Vencimento:                     │
│ [Entre: 01/12 - 31/12______]    │
├─────────────────────────────────┤
│ [Limpar Tudo] [Aplicar]        │
└─────────────────────────────────┘
```

**Código:**
```typescript
// No AgGridReact:
sideBar={{
  toolPanels: [
    {
      id: "filters",
      labelDefault: "Filtros",
      labelKey: "filters",
      iconKey: "filter",
      toolPanel: "agFiltersToolPanel",
      toolPanelParams: {
        suppressExpandAll: false,
        suppressFilterSearch: false,
      },
    },
  ],
}}
```

---

## 🚀 **EXEMPLO COMPLETO: Contas a Pagar**

```typescript
const columnDefs: ColDef[] = [
  {
    field: "documentNumber",
    headerName: "Documento",
    filter: "agTextColumnFilter", // ✅ Digitar para buscar
    filterParams: {
      filterOptions: ['contains', 'startsWith'],
      defaultOption: 'contains',
      buttons: ['apply', 'reset'],
    },
  },
  {
    field: "partnerName",
    headerName: "Fornecedor",
    filter: "agSetColumnFilter", // ✅ Lista de fornecedores
    filterParams: {
      values: (params) => {
        // Busca todos os fornecedores únicos
        const allPartners = [...new Set(payables.map(p => p.partnerName))];
        params.success(allPartners);
      },
      buttons: ['apply', 'reset'],
    },
  },
  {
    field: "status",
    headerName: "Status",
    filter: "agSetColumnFilter", // ✅ Checkbox list
    filterParams: {
      values: ['OPEN', 'PAID', 'OVERDUE', 'CANCELLED'],
      buttons: ['apply', 'reset'],
    },
  },
  {
    field: "amount",
    headerName: "Valor",
    filter: "agNumberColumnFilter", // ✅ Filtro numérico
    filterParams: {
      filterOptions: [
        'equals',
        'greaterThan',
        'lessThan',
        'inRange',
      ],
      buttons: ['apply', 'reset'],
    },
  },
  {
    field: "dueDate",
    headerName: "Vencimento",
    filter: "agDateColumnFilter", // ✅ Filtro de data
    filterParams: {
      filterOptions: [
        'equals',
        'lessThan',
        'greaterThan',
        'inRange',
      ],
      buttons: ['apply', 'reset'],
    },
  },
];

// No AgGridReact:
<AgGridReact
  columnDefs={columnDefs}
  rowData={payables}
  
  // ✅ Habilitar filtros
  defaultColDef={{
    filter: true,          // Filtro em todas colunas
    floatingFilter: true,  // Barra de filtro flutuante
    sortable: true,
    resizable: true,
  }}
  
  // ✅ Sidebar com painel de filtros
  sideBar={{
    toolPanels: [
      {
        id: "filters",
        labelDefault: "Filtros",
        labelKey: "filters",
        iconKey: "filter",
        toolPanel: "agFiltersToolPanel",
      },
      {
        id: "columns",
        labelDefault: "Colunas",
        labelKey: "columns",
        iconKey: "columns",
        toolPanel: "agColumnsToolPanel",
      },
    ],
  }}
/>
```

---

## 📸 **VISUALIZAÇÃO DOS FILTROS**

### **Floating Filter (Barra de Filtro Flutuante):**

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Documento ▼  │ Fornecedor ▼ │ Status ▼     │ Valor ▼      │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ [🔍 NF1234]  │ [🔍 Trans]   │ [☑ OPEN]     │ [> 1000]     │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ NF-1234      │ Transportes  │ OPEN         │ R$ 1.500,00  │
│ NF-5678      │ Transportes  │ OPEN         │ R$ 2.000,00  │
│ NF-9012      │ Logística    │ PAID         │ R$ 500,00    │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

### **Set Filter (Dropdown com Checkboxes):**

Ao clicar em "Status ▼":

```
┌─────────────────────────────────┐
│ Status                      [X] │
├─────────────────────────────────┤
│ 🔍 Pesquisar status...          │
│ [_________________________]     │
├─────────────────────────────────┤
│ ☑ Selecionar Tudo              │
├─────────────────────────────────┤
│ ☑ OPEN (15 registros)          │
│ ☑ PAID (8 registros)           │
│ ☐ OVERDUE (3 registros)        │
│ ☐ CANCELLED (2 registros)      │
├─────────────────────────────────┤
│        [Limpar] [Aplicar]      │
└─────────────────────────────────┘
```

---

## 🎨 **PERSONALIZAÇÃO DOS FILTROS**

### **1. Custom Set Filter com Valores do Servidor:**

```typescript
filterParams: {
  values: async (params) => {
    // Busca valores únicos do servidor
    const response = await fetch('/api/financial/payables/filter-values?field=partnerName');
    const data = await response.json();
    params.success(data.values);
  },
  refreshValuesOnOpen: true, // Atualiza ao abrir
},
```

### **2. Multi Filter (Combinar Text + Set):**

```typescript
filter: "agMultiColumnFilter",
filterParams: {
  filters: [
    {
      filter: "agTextColumnFilter",
      filterParams: {
        filterOptions: ['contains'],
      },
    },
    {
      filter: "agSetColumnFilter",
      filterParams: {
        values: ['OPEN', 'PAID'],
      },
    },
  ],
},
```

### **3. Custom Filter Renderer:**

```typescript
filterParams: {
  cellRenderer: (params) => {
    return `<strong>${params.value}</strong> (${params.count})`;
  },
},
```

---

## 🚀 **FEATURES AVANÇADAS**

### **1. Excel-Style Filtering:**
- Checkbox list como Excel
- Search box integrado
- Contagem de registros por valor

### **2. Quick Filter (Busca Global):**
```typescript
<input 
  type="text" 
  placeholder="Buscar em todas colunas..."
  onChange={(e) => gridRef.current?.api.setGridOption('quickFilterText', e.target.value)}
/>
```

### **3. External Filter (Filtro Customizado):**
```typescript
const isExternalFilterPresent = () => {
  return showOnlyOverdue;
};

const doesExternalFilterPass = (node) => {
  if (showOnlyOverdue) {
    return node.data.status === 'OVERDUE';
  }
  return true;
};

<AgGridReact
  isExternalFilterPresent={isExternalFilterPresent}
  doesExternalFilterPass={doesExternalFilterPass}
/>
```

---

## 📊 **RECOMENDAÇÃO PARA AURA CORE**

### **Opção A: Filtros Básicos (Todas as Telas)**
- ✅ `floatingFilter: true` em todas colunas
- ✅ Set Filter para Status, Categorias
- ✅ Text Filter para Textos
- ✅ Number Filter para Valores
- ✅ Date Filter para Datas

### **Opção B: Filtros Avançados (Telas Principais)**
- ✅ Opção A + Sidebar de Filtros
- ✅ Opção A + Quick Filter (busca global)
- ✅ Salvar filtros favoritos

### **Opção C: Filtros Premium (Contas a Pagar/Receber)**
- ✅ Opção B + Multi Filter
- ✅ Opção B + Custom Renderers
- ✅ Opção B + Valores do servidor

---

## 🎯 **EXEMPLO VISUAL COMPLETO**

Vou criar uma demonstração na tela de **Contas a Pagar** com:

1. ✅ **Floating Filters** em todas colunas
2. ✅ **Set Filter** para Status e Fornecedor
3. ✅ **Number Filter** para Valor
4. ✅ **Date Filter** para Vencimento
5. ✅ **Quick Filter** (busca global)
6. ✅ **Sidebar** com painel de filtros

---

## 📝 **PRÓXIMO PASSO**

**Qual opção você prefere testar primeiro?**

**A)** Implementar na tela de **Contas a Pagar** (exemplo completo)  
**B)** Implementar em **TODAS** as telas do AG Grid  
**C)** Ver uma demonstração visual antes (vídeo/gif)  

**Aguardo sua escolha!**




