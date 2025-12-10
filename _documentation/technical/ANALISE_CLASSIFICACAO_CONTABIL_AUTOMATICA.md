# 🏦 ANÁLISE: CLASSIFICAÇÃO CONTÁBIL AUTOMÁTICA DE DOCUMENTOS FISCAIS

**Data:** 08/12/2025  
**Objetivo:** Definir melhores práticas para categorização automática de NFes e CTes  
**Status:** 📋 **ANÁLISE PARA APROVAÇÃO**

---

## 🎯 **PERGUNTA PRINCIPAL:**

> **"No momento que um documento fiscal é importado (receita ou despesa), qual é o procedimento correto para padronizar planos de contas? É por NF total, por NCM do produto?"**

---

## 🔍 **ANÁLISE DO SISTEMA ATUAL:**

### **O QUE JÁ EXISTE:** ✅

```typescript
// 1. PLANO DE CONTAS GERENCIAL (Hierárquico)
chartOfAccounts {
  code: "4.1.01.001"           // Código contábil
  name: "Combustível Próprio"   // Nome da conta
  type: "EXPENSE"               // Tipo: REVENUE, EXPENSE, ASSET, etc
  category: "OPERATIONAL_OWN_FLEET" // Categoria operacional
  level: 3                      // Nível hierárquico
  isAnalytical: "true"          // Conta analítica (recebe lançamento)
  requiresCostCenter: "true"    // Exige centro de custo
}

// 2. CATEGORIAS FINANCEIRAS (Simplificado)
financialCategories {
  name: "Combustível"
  code: "1.01.02"
  type: "EXPENSE" // ou "INCOME"
}

// 3. CENTROS DE CUSTO
costCenters {
  code: "CC-001"
  name: "Operacional - Frota Própria"
  type: "OPERATIONAL"
}

// 4. CONTAS A PAGAR/RECEBER
accountsPayable {
  categoryId: int           // FK financial_categories
  chartAccountId: int       // FK chart_of_accounts
  costCenterId: int         // FK cost_centers
}
```

### **O QUE FALTA:** ❌

- ❌ **Matriz de Classificação Automática** (NCM → Conta Contábil)
- ❌ **Regras de Negócio** (CFOP → Categoria)
- ❌ **Configuração por Fornecedor** (Fornecedor X → Sempre Categoria Y)
- ❌ **Rateio por Item** (NFe com múltiplos NCMs)

---

## 📚 **BENCHMARKS - MELHORES PRÁTICAS:**

### **BENCHMARK 1: TOTVS Protheus** 🏆

**Abordagem:**
1. **Amarração Fornecedor → Conta Contábil**
   - Cada fornecedor tem conta padrão
   - Ex: Shell → Sempre "Combustível" (4.1.01.001)

2. **Amarração CFOP → Conta Contábil**
   - CFOP 5.102 (Venda Mercadoria) → Receita Venda
   - CFOP 1.102 (Compra Mercadoria) → Despesa Compra

3. **Amarração NCM → Conta Contábil** (Opcional)
   - NCM 2710.12.51 (Diesel) → Combustível
   - NCM 8708.99.90 (Peças) → Manutenção

4. **Rateio por Item** (Quando necessário)
   - NFe com 10 itens → 10 lançamentos contábeis
   - Cada item com sua conta específica

---

### **BENCHMARK 2: SAP Business One** 🏆

**Abordagem:**
1. **Classificação Híbrida:**
   - **Nível 1:** Fornecedor (regra geral)
   - **Nível 2:** NCM (refinamento)
   - **Nível 3:** CFOP (tipo de operação)

2. **Contabilização:**
   - **Opção A:** Por NFe Total (1 lançamento)
   - **Opção B:** Por Item (N lançamentos)
   - **Opção C:** Por NCM Agrupado (grupos de itens)

3. **Centro de Custo:**
   - Vinculado à **filial** (branch)
   - Ou vinculado ao **departamento** solicitante

---

### **BENCHMARK 3: Senior Gestão Empresarial** 🏆

**Abordagem:**
1. **Matriz Tributária Expandida:**
   ```
   NCM + CFOP + UF → Conta Contábil
   ```

2. **Prioridade de Classificação:**
   ```
   1º - Regra específica (Fornecedor + NCM)
   2º - NCM
   3º - CFOP
   4º - Fornecedor
   5º - Padrão da Categoria
   ```

3. **Contabilização Detalhada:**
   - Cada item = 1 linha no lançamento contábil
   - Agrupa por conta contábil no final

---

### **BENCHMARK 4: Omie ERP** 🏆

**Abordagem:**
1. **Categorias de Despesa/Receita:**
   - Simples e diretas
   - Ex: "Combustível", "Manutenção", "Frete"

2. **Auto-Classificação:**
   - Por **palavra-chave** no nome do fornecedor
   - Ex: "POSTO", "SHELL" → Combustível
   - Ex: "AUTO PEÇAS" → Manutenção

3. **Plano de Contas Referencial:**
   - Usa Plano Referencial SPED (CPC)
   - Empresa customiza depois

---

## 🎯 **RECOMENDAÇÃO PARA AURACORE:**

### **ABORDAGEM HÍBRIDA - 3 NÍVEIS:**

```
┌─────────────────────────────────────────────────────┐
│          NÍVEL 1: CLASSIFICAÇÃO POR TIPO NFe         │
│                                                      │
│  PURCHASE (Compra)  → Despesa                        │
│  CARGO (Transporte) → Receita                        │
│  RETURN (Devolução) → Ajuste                         │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│       NÍVEL 2: MATRIZ DE CLASSIFICAÇÃO (NCM)         │
│                                                      │
│  NCM 2710.12.51 → Combustível (4.1.01.001)           │
│  NCM 8708.*     → Manutenção (4.1.02.001)            │
│  NCM 4011.*     → Pneus (4.1.02.002)                 │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│      NÍVEL 3: REGRA DE FORNECEDOR (Override)         │
│                                                      │
│  Fornecedor "SHELL" → Sempre Combustível             │
│  Fornecedor "OFICINA X" → Sempre Manutenção          │
└─────────────────────────────────────────────────────┘
```

---

## 📊 **DETALHAMENTO DA SOLUÇÃO:**

### **CENÁRIO 1: NFe de COMPRA (PURCHASE)**

#### **Opção A: CONTABILIZAÇÃO POR NFe TOTAL** ⚡ **SIMPLES**

**Vantagens:**
- ✅ Rápido e simples
- ✅ 1 lançamento por NFe
- ✅ Fácil de entender

**Desvantagens:**
- ❌ Não detalha itens
- ❌ Não classifica por NCM
- ❌ NFe com múltiplos produtos = 1 conta só

**Quando usar:**
- NFe com 1 produto apenas
- Ou NFe com produtos da mesma categoria
- Ex: NFe de combustível (Shell) → Tudo "Combustível"

**Implementação:**
```typescript
// Busca regra por fornecedor
const category = await getSupplierDefaultCategory(supplierId);

// Cria 1 conta a pagar com total da NFe
await db.insert(accountsPayable).values({
  partnerId: supplierId,
  categoryId: category.id,
  chartAccountId: category.chartAccountId,
  amount: nfe.totals.nfe, // Total da NFe
  description: `NFe ${nfe.number} - ${supplier.name}`,
});
```

---

#### **Opção B: CONTABILIZAÇÃO POR ITEM (NCM)** 🎯 **DETALHADO**

**Vantagens:**
- ✅ Classificação precisa por NCM
- ✅ Detalhamento total
- ✅ Relatórios gerenciais ricos

**Desvantagens:**
- ❌ Mais complexo
- ❌ Mais lançamentos no banco
- ❌ Pode gerar muitas contas

**Quando usar:**
- NFe com múltiplos produtos de categorias diferentes
- Ex: NFe com Diesel + Óleo + Pneu → 3 categorias

**Implementação:**
```typescript
// Para cada item da NFe
for (const item of nfe.items) {
  // Busca regra por NCM
  const category = await getNCMCategory(item.ncm);
  
  // Cria 1 conta a pagar por item
  await db.insert(accountsPayable).values({
    partnerId: supplierId,
    categoryId: category.id,
    chartAccountId: category.chartAccountId,
    amount: item.totalPrice,
    description: `NFe ${nfe.number} - ${item.productName} (${item.ncm})`,
  });
}
```

---

#### **Opção C: CONTABILIZAÇÃO POR NCM AGRUPADO** 🏆 **RECOMENDADO**

**Vantagens:**
- ✅ Equilíbrio entre simplicidade e detalhe
- ✅ Agrupa itens da mesma categoria
- ✅ Menos lançamentos que Opção B

**Desvantagens:**
- ❌ Um pouco mais complexo que Opção A

**Quando usar:**
- **SEMPRE!** É a melhor prática do mercado
- NFe com múltiplos produtos
- Ex: NFe com 5 itens de Diesel + 2 de Óleo → 2 contas a pagar

**Implementação:**
```typescript
// Agrupa itens por categoria
const itemsByCategory = groupItemsByNCM(nfe.items);

// Para cada categoria
for (const [categoryId, items] of itemsByCategory) {
  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  await db.insert(accountsPayable).values({
    partnerId: supplierId,
    categoryId: category.id,
    chartAccountId: category.chartAccountId,
    amount: totalAmount,
    description: `NFe ${nfe.number} - ${category.name} (${items.length} itens)`,
  });
}
```

**Exemplo Prático:**
```
NFe 12345 (Shell):
- Item 1: Diesel S10 (NCM 2710.12.51) → R$ 3.000
- Item 2: Diesel S500 (NCM 2710.12.59) → R$ 2.000
- Item 3: Óleo Motor (NCM 2710.19.31) → R$ 500
- Item 4: Arla 32 (NCM 3102.10.10) → R$ 300

Resultado (Opção C):
→ Conta a Pagar 1: "Combustível" = R$ 5.000 (Diesel S10 + S500)
→ Conta a Pagar 2: "Lubrificantes" = R$ 500 (Óleo)
→ Conta a Pagar 3: "Aditivos" = R$ 300 (Arla)

TOTAL: 3 contas a pagar (ao invés de 4 ou 1)
```

---

### **CENÁRIO 2: CTe EMITIDO (RECEITA)**

**Classificação:**
- ✅ Sempre categoria "RECEITA DE FRETE"
- ✅ Conta contábil: "3.1.01.001 - Receita Operacional Transporte"
- ✅ Centro de custo: Filial emissora

**Implementação:**
```typescript
// Busca categoria padrão de frete
const category = await getDefaultFreightCategory(organizationId);

// Cria conta a receber
await db.insert(accountsReceivable).values({
  partnerId: clientId, // Remetente ou Destinatário
  categoryId: category.id,
  chartAccountId: category.chartAccountId,
  amount: cte.total_service,
  description: `CTe ${cte.cte_number} - ${client.name}`,
});
```

---

## 🗄️ **ESTRUTURA DE DADOS NECESSÁRIA:**

### **1. MATRIZ DE CLASSIFICAÇÃO AUTOMÁTICA** 🆕

```typescript
export const autoClassificationRules = mssqlTable("auto_classification_rules", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  
  // Prioridade (menor = mais importante)
  priority: int("priority").default(100).notNull(),
  
  // Regras de Match
  matchType: nvarchar("match_type", { length: 30 }).notNull(), 
  // 'NCM', 'CFOP', 'SUPPLIER', 'NCM_CFOP', 'KEYWORD'
  
  // Valores de Match
  ncmCode: nvarchar("ncm_code", { length: 10 }), // Ex: "2710.12.51" ou "2710.*"
  cfopCode: nvarchar("cfop_code", { length: 10 }), // Ex: "1.102"
  supplierId: int("supplier_id"), // FK business_partners
  keyword: nvarchar("keyword", { length: 100 }), // Ex: "COMBUSTIVEL", "DIESEL"
  
  // Tipo de Operação
  operationType: nvarchar("operation_type", { length: 20 }).notNull(),
  // 'PURCHASE', 'SALE', 'RETURN', 'TRANSPORT'
  
  // Classificação Resultante
  categoryId: int("category_id").notNull(), // FK financial_categories
  chartAccountId: int("chart_account_id").notNull(), // FK chart_of_accounts
  costCenterId: int("cost_center_id"), // FK cost_centers (opcional)
  
  // Descrição
  name: nvarchar("name", { length: 255 }).notNull(),
  description: nvarchar("description", { length: "max" }),
  
  // Status
  isActive: nvarchar("is_active", { length: 10 }).default("true"),
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});
```

---

### **2. PLANO DE CONTAS REFERENCIAL (Seeded)** 📋

**Plano de Contas Sugerido para Transportadoras:**

```
📊 RECEITAS (3.x.xx.xxx)
├─ 3.1 - Receita Operacional
│  ├─ 3.1.01 - Receita de Transporte
│  │  ├─ 3.1.01.001 - Frete - Frota Própria
│  │  ├─ 3.1.01.002 - Frete - Agregados
│  │  └─ 3.1.01.003 - Frete - Terceiros (Redespacho)
│  └─ 3.1.02 - Receitas Acessórias
│     ├─ 3.1.02.001 - Taxa de Coleta/Entrega
│     ├─ 3.1.02.002 - Seguro
│     └─ 3.1.02.003 - Pedagio
└─ 3.2 - Receita Não Operacional
   └─ 3.2.01.001 - Receitas Financeiras

💰 DESPESAS (4.x.xx.xxx)
├─ 4.1 - Despesas Operacionais - Frota Própria
│  ├─ 4.1.01 - Combustível
│  │  ├─ 4.1.01.001 - Diesel S10
│  │  ├─ 4.1.01.002 - Diesel S500
│  │  └─ 4.1.01.003 - Arla 32
│  ├─ 4.1.02 - Manutenção Frota
│  │  ├─ 4.1.02.001 - Peças e Acessórios
│  │  ├─ 4.1.02.002 - Pneus
│  │  ├─ 4.1.02.003 - Mão de Obra Mecânica
│  │  └─ 4.1.02.004 - Lubrificantes
│  ├─ 4.1.03 - Pessoal Operacional
│  │  ├─ 4.1.03.001 - Salários Motoristas
│  │  ├─ 4.1.03.002 - Encargos Sociais
│  │  └─ 4.1.03.003 - Benefícios (Vale Refeição, etc)
│  └─ 4.1.04 - Tributos Operacionais
│     ├─ 4.1.04.001 - IPVA
│     ├─ 4.1.04.002 - Seguro Obrigatório
│     └─ 4.1.04.003 - Licenciamento
│
├─ 4.2 - Despesas Operacionais - Terceiros
│  ├─ 4.2.01.001 - Frete Pago (Redespacho)
│  └─ 4.2.02.001 - Frete Agregados
│
└─ 4.3 - Despesas Administrativas
   ├─ 4.3.01 - Pessoal Administrativo
   ├─ 4.3.02 - Aluguel
   ├─ 4.3.03 - Energia Elétrica
   ├─ 4.3.04 - Telefonia/Internet
   └─ 4.3.05 - Material de Escritório
```

---

### **3. MATRIZ NCM → CATEGORIA (Seeded)** 🗺️

**Principais NCMs do Setor de Transporte:**

| NCM | Descrição | Categoria | Conta Contábil |
|-----|-----------|-----------|----------------|
| **2710.12.51** | Diesel S10 | Combustível | 4.1.01.001 |
| **2710.12.59** | Diesel S500 | Combustível | 4.1.01.002 |
| **3102.10.10** | Arla 32 (Ureia) | Aditivos | 4.1.01.003 |
| **2710.19.31** | Óleo Motor | Lubrificantes | 4.1.02.004 |
| **4011.20.00** | Pneus | Pneus | 4.1.02.002 |
| **8708.99.90** | Peças Veículos | Peças | 4.1.02.001 |
| **8708.30.90** | Sistemas de Freio | Peças | 4.1.02.001 |
| **8481.80.99** | Válvulas | Peças | 4.1.02.001 |
| **3403.19.00** | Graxa | Lubrificantes | 4.1.02.004 |
| **8536.50.90** | Interruptores | Peças Elétricas | 4.1.02.001 |

---

## 🏗️ **ARQUITETURA DA SOLUÇÃO:**

### **COMPONENTES A CRIAR:**

```
src/services/accounting/
├── classification-engine.ts          # 🆕 Motor de classificação
├── ncm-matcher.ts                    # 🆕 Match por NCM
├── supplier-matcher.ts               # 🆕 Match por fornecedor
├── account-allocator.ts              # 🆕 Alocação de contas
└── seeder/
    ├── chart-of-accounts-seed.ts     # 🆕 Plano de contas padrão
    └── ncm-classification-seed.ts    # 🆕 Matriz NCM → Categoria

src/services/financial/
└── split-by-category.ts              # 🆕 Rateio por categoria

src/app/api/admin/
└── seed-accounting/route.ts          # 🆕 Popular plano de contas
```

---

## 📝 **FLUXO DE CLASSIFICAÇÃO:**

### **PASSO A PASSO:**

```typescript
// 1. NFe importada
const nfe = await parseNFeXML(xmlContent);

// 2. Classifica NFe (PURCHASE, CARGO, etc)
const nfeType = classifyNFe(nfe);

// 3. Agrupa itens por categoria (baseado em NCM)
const itemsByCategory = await groupItemsByCategory(nfe.items, organizationId);

// Resultado:
itemsByCategory = [
  {
    categoryId: 1,
    chartAccountId: 10,
    costCenterId: 5,
    categoryName: "Combustível",
    items: [Item1, Item2], // Diesel S10 + S500
    totalAmount: 5000.00
  },
  {
    categoryId: 2,
    chartAccountId: 11,
    costCenterId: 5,
    categoryName: "Lubrificantes",
    items: [Item3], // Óleo
    totalAmount: 500.00
  }
]

// 4. Cria contas a pagar (1 por categoria)
for (const group of itemsByCategory) {
  await createPayableFromCategory(group, nfe, supplierId);
}
```

---

### **FUNÇÃO DE CLASSIFICAÇÃO:**

```typescript
async function groupItemsByCategory(
  items: NFeItem[],
  organizationId: number
): Promise<CategoryGroup[]> {
  
  const groups = new Map<number, CategoryGroup>();
  
  for (const item of items) {
    // Busca regra de classificação (por prioridade)
    const rule = await db
      .select()
      .from(autoClassificationRules)
      .where(
        and(
          eq(autoClassificationRules.organizationId, organizationId),
          eq(autoClassificationRules.isActive, "true"),
          or(
            // Match por NCM exato
            eq(autoClassificationRules.ncmCode, item.ncm),
            // Match por NCM parcial (wildcard)
            like(item.ncm, autoClassificationRules.ncmCode.replace("*", "%"))
          )
        )
      )
      .orderBy(asc(autoClassificationRules.priority))
      .limit(1);
    
    if (!rule[0]) {
      // Regra padrão (se não encontrar)
      rule[0] = await getDefaultRule(organizationId, "PURCHASE");
    }
    
    // Agrupa por categoryId
    const key = rule[0].categoryId;
    
    if (!groups.has(key)) {
      groups.set(key, {
        categoryId: rule[0].categoryId,
        chartAccountId: rule[0].chartAccountId,
        costCenterId: rule[0].costCenterId,
        categoryName: rule[0].name,
        items: [],
        totalAmount: 0
      });
    }
    
    const group = groups.get(key)!;
    group.items.push(item);
    group.totalAmount += item.totalPrice;
  }
  
  return Array.from(groups.values());
}
```

---

## 🧪 **EXEMPLOS PRÁTICOS:**

### **EXEMPLO 1: NFe Shell (Combustível)**

```xml
<NFe>
  <emit>
    <xNome>RAIZEN COMBUSTIVEIS S.A.</xNome>
  </emit>
  <det nItem="1">
    <prod>
      <xProd>DIESEL S10</xProd>
      <NCM>27101251</NCM>
      <vProd>3000.00</vProd>
    </prod>
  </det>
  <det nItem="2">
    <prod>
      <xProd>ARLA 32</xProd>
      <NCM>31021010</NCM>
      <vProd>300.00</vProd>
    </prod>
  </det>
</NFe>
```

**Classificação Automática:**
```
Item 1: NCM 27101251 → Regra: "Diesel S10"
  → Categoria: "Combustível"
  → Conta: 4.1.01.001
  → Valor: R$ 3.000

Item 2: NCM 31021010 → Regra: "Arla 32"
  → Categoria: "Aditivos"
  → Conta: 4.1.01.003
  → Valor: R$ 300

Resultado: 2 contas a pagar
```

---

### **EXEMPLO 2: NFe Auto Peças (Múltiplos NCMs)**

```xml
<NFe>
  <emit>
    <xNome>AUTO PECAS XYZ LTDA</xNome>
  </emit>
  <det nItem="1">
    <prod>
      <xProd>PASTILHA DE FREIO</xProd>
      <NCM>87083090</NCM>
      <vProd>450.00</vProd>
    </prod>
  </det>
  <det nItem="2">
    <prod>
      <xProd>FILTRO DE AR</xProd>
      <NCM>84213100</NCM>
      <vProd>120.00</vProd>
    </prod>
  </det>
  <det nItem="3">
    <prod>
      <xProd>OLEO MOTOR 15W40</xProd>
      <NCM>27101931</NCM>
      <vProd>280.00</vProd>
    </prod>
  </det>
</NFe>
```

**Classificação Automática:**
```
Item 1: NCM 87083090 → Regra: "Peças 8708.*"
  → Categoria: "Peças e Acessórios"
  → Conta: 4.1.02.001
  → Valor: R$ 450

Item 2: NCM 84213100 → Regra: "Peças 8421.*"
  → Categoria: "Peças e Acessórios"
  → Conta: 4.1.02.001
  → Valor: R$ 120

Item 3: NCM 27101931 → Regra: "Lubrificantes"
  → Categoria: "Lubrificantes"
  → Conta: 4.1.02.004
  → Valor: R$ 280

Agrupamento:
→ Conta a Pagar 1: "Peças e Acessórios" = R$ 570 (Items 1+2)
→ Conta a Pagar 2: "Lubrificantes" = R$ 280 (Item 3)

TOTAL: 2 contas a pagar
```

---

## 📊 **COMPARAÇÃO DAS OPÇÕES:**

| Critério | Opção A (Total NFe) | Opção B (Por Item) | Opção C (Agrupado) |
|----------|---------------------|--------------------|--------------------|
| **Simplicidade** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Precisão** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |
| **Relatórios** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Gestão** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Recomendado?** | ❌ | ⚠️ Casos específicos | ✅ **SIM** |

---

## 🎯 **RECOMENDAÇÃO FINAL:**

### **✅ OPÇÃO C - CONTABILIZAÇÃO POR NCM AGRUPADO**

**Por quê:**
1. ✅ Precisão contábil (classifica por NCM)
2. ✅ Relatórios gerenciais ricos
3. ✅ Não gera excesso de lançamentos
4. ✅ Padrão do mercado (SAP, TOTVS, Senior)
5. ✅ Facilita auditoria e análise

**Implementação:**
1. Criar tabela `auto_classification_rules`
2. Popular com NCMs principais do setor
3. Motor de classificação por prioridade
4. Agrupar itens por categoria
5. Gerar 1 conta a pagar por grupo

---

## 📋 **CRONOGRAMA DE IMPLEMENTAÇÃO:**

| Sprint | Tarefa | Tempo |
|--------|--------|-------|
| **SPRINT 0** | Setup Estrutura | 2h |
| 0.1 | Criar tabela `auto_classification_rules` | 30min |
| 0.2 | Criar seeder de plano de contas | 1h |
| 0.3 | Criar seeder de matriz NCM | 30min |
| **SPRINT 1** | Motor de Classificação | 3h |
| 1.1 | Criar `classification-engine.ts` | 1h |
| 1.2 | Criar `groupItemsByCategory()` | 1h |
| 1.3 | Integrar com nfe-parser | 1h |
| **SPRINT 2** | Integração Financeira | 2h |
| 2.1 | Modificar `createPayablesFromNFe()` | 1h |
| 2.2 | Testes e validação | 1h |
| **TOTAL** | | **7h** |

---

## ❓ **PERGUNTAS PARA APROVAÇÃO:**

### **1. MÉTODO DE CONTABILIZAÇÃO:**

- [ ] **Opção A:** Por NFe Total (1 lançamento)
- [ ] **Opção B:** Por Item (N lançamentos)
- [x] **Opção C:** Por NCM Agrupado (recomendado) 🏆

### **2. PLANO DE CONTAS:**

- [ ] Usar plano de contas existente
- [ ] Criar plano de contas padrão (seeded)
- [ ] Combinação (seed + customização)

### **3. PRIORIDADE DE CLASSIFICAÇÃO:**

```
1º - NCM exato (2710.12.51)
2º - NCM parcial (2710.*)
3º - Fornecedor específico
4º - Categoria padrão
```

Aprova esta ordem?
- [ ] Sim
- [ ] Não (sugerir outra)

### **4. REGRAS CUSTOMIZADAS:**

Quer criar regras específicas manualmente ou começar com seeded?
- [ ] Apenas seeded (automático)
- [ ] Seeded + UI para customizar
- [ ] Apenas manual (UI completa)

---

## 🚀 **PRÓXIMOS PASSOS:**

**Após aprovação:**

1. ✅ Implementar Sprint 0 (Setup)
2. ✅ Implementar Sprint 1 (Classificação)
3. ✅ Implementar Sprint 2 (Integração)
4. ✅ Testar com NFes reais
5. ✅ Integrar com Contas a Pagar/Receber

**Tempo total estimado:** 7 horas

---

## 📄 **REFERÊNCIAS:**

- SPED - Plano Referencial CPC
- TOTVS Protheus - Manual Contábil
- SAP B1 - Accounting Setup
- Senior X - Matriz Tributária
- Lei nº 6.404/76 (Lei das S.A.)

---

**Aguardando aprovação para prosseguir!** 🚀

**Qual método você escolhe? Opção A, B ou C?**





