# 🔍 ANÁLISE DETALHADA: Importação XML NFe/CTe

**Data:** 11 de Dezembro de 2025  
**Tipo:** Análise Técnica Completa  
**Status:** ✅ DOCUMENTAÇÃO FINALIZADA

---

## 📋 ÍNDICE

1. [NFe de Compra - Fluxo Completo](#nfe-compra)
2. [CTe - Fluxo Completo](#cte)
3. [Classificação Automática](#classificacao)
4. [Estrutura de Dados](#estrutura)
5. [Diagrama de Fluxo](#diagrama)

---

<a name="nfe-compra"></a>
## 🧾 1. NFe DE COMPRA - FLUXO COMPLETO

### **📥 PASSO 1: IMPORTAÇÃO DO XML**

**Origem:**
- ✅ SEFAZ (Download automático via certificado A1)
- ✅ Upload manual (tela Upload XML)

**Arquivo:** `src/services/sefaz-processor.ts`

**Função Principal:** `importNFeAutomatically()`

```typescript
async function importNFeAutomatically(
  xmlContent: string,
  organizationId: number,
  branchId: number,
  userId: string
): Promise<"SUCCESS" | "DUPLICATE">
```

**O que faz:**
1. ✅ **Parse do XML** → Extrai todos os dados estruturados
2. ✅ **Verifica duplicata** → Checa se chave de acesso já existe
3. ✅ **Auto-cadastro de fornecedor** → Se não existir, cria automaticamente
4. ✅ **Classificação fiscal** → PURCHASE, CARGO, RETURN ou OTHER
5. ✅ **Insere documento fiscal** → Tabela `fiscal_documents`
6. ✅ **Cria contas a pagar** → Se for PURCHASE (compra)

---

### **🏷️ PASSO 2: CLASSIFICAÇÃO FISCAL AUTOMÁTICA**

**Arquivo:** `src/services/fiscal-classification-service.ts`

**Função:** `classifyNFe(nfe, branchCNPJ)`

#### **Regras de Classificação (por prioridade):**

**1. DEVOLUÇÃO (máxima prioridade)**
```typescript
if (
  natureza.includes("DEVOLUCAO") ||
  cfop === "5202" || cfop === "6202" || // Devolução de compra
  cfop === "1202" || cfop === "2202"    // Devolução de venda
) {
  return "RETURN";
}
```
- ❌ **NÃO gera contas a pagar/receber**
- ✅ Apenas registra o documento

**2. CARGA (somos o transportador)**
```typescript
if (transporterCNPJ === branchCNPJ) {
  return "CARGO";
}
```
- ✅ **Gera conta a RECEBER** (é uma receita de frete)
- ✅ Classificação: Receita de Transporte

**3. COMPRA (destinatário somos nós)** ⭐
```typescript
if (recipientCNPJ === branchCNPJ) {
  return "PURCHASE";
}
```
- ✅ **Gera contas a PAGAR** (é uma despesa)
- ✅ **Ativa o motor de classificação contábil**
- ✅ **Agrupamento por NCM**

**4. VENDA (emitente somos nós)**
```typescript
if (issuerCNPJ === branchCNPJ) {
  return "SALE";
}
```
- ❌ **Não implementado** (NFe de saída não é importada da SEFAZ)

**5. OUTRO (não identificado)**
- ❌ Não gera movimentação financeira
- ⚠️ Fica pendente de classificação manual

---

### **🧠 PASSO 3: CLASSIFICAÇÃO CONTÁBIL AUTOMÁTICA (APENAS PURCHASE)**

**Arquivo:** `src/services/accounting/classification-engine.ts`

**Função:** `classifyNFeItem(item, organizationId, supplierId, operationType)`

#### **Como Funciona:**

**3.1 - Para cada item da NFe:**

```typescript
const item = {
  ncm: "27101251",              // NCM do produto
  cfop: "1102",                 // CFOP da operação
  productName: "DIESEL S10",     // Nome do produto
  quantity: 1000,                // Quantidade
  unitPrice: 5.50,               // Preço unitário
  totalPrice: 5500.00            // Total do item
}
```

**3.2 - Busca regra de classificação:**

O motor percorre as regras por **ordem de prioridade** (menor número = maior prioridade):

| Tipo de Match | Prioridade | Exemplo |
|---------------|------------|---------|
| **NCM Exato** | 10 ⭐ | `27101251` → Diesel S10 |
| **NCM Wildcard** | 50 | `2710*` → Todos combustíveis |
| **NCM + CFOP** | 15 | `2710* + 1102` → Compra Diesel |
| **Fornecedor** | 30 | `Shell` → Sempre Combustível |
| **Palavra-chave** | 70 | `DIESEL` no nome → Combustível |

**3.3 - Resultado da Classificação:**

```typescript
ClassificationResult {
  categoryId: 1,
  categoryName: "Combustível",
  chartAccountId: 15,
  chartAccountCode: "4.1.01.001",
  chartAccountName: "Diesel S10",
  costCenterId: 3,
  ruleName: "NCM Diesel S10",
  matchType: "NCM"
}
```

---

### **📦 PASSO 4: AGRUPAMENTO POR CATEGORIA (Opção C)**

**Arquivo:** `src/services/accounting/group-by-category.ts`

**Função:** `groupItemsByCategory(items, organizationId)`

#### **Exemplo Prático:**

**NFe 12345 - Shell - R$ 15.750,00**

**Itens:**
1. Diesel S10 (1000L) → NCM 27101251 → R$ 5.500
2. Diesel S500 (500L) → NCM 27101259 → R$ 2.500
3. Óleo Motor (20L) → NCM 27101931 → R$ 2.000
4. Arla 32 (100L) → NCM 31021010 → R$ 800
5. Pneu (4un) → NCM 40112000 → R$ 4.950

**Agrupamento:**

```
Grupo 1: Combustível (R$ 8.000)
├─ Item 1: Diesel S10 (R$ 5.500)
└─ Item 2: Diesel S500 (R$ 2.500)

Grupo 2: Lubrificantes (R$ 2.000)
└─ Item 3: Óleo Motor (R$ 2.000)

Grupo 3: Aditivos (R$ 800)
└─ Item 4: Arla 32 (R$ 800)

Grupo 4: Pneus (R$ 4.950)
└─ Item 5: Pneu (R$ 4.950)
```

**Resultado:** **4 grupos = 4 contas a pagar**

---

### **💰 PASSO 5: CRIAÇÃO DAS CONTAS A PAGAR**

**Arquivo:** `src/services/financial/nfe-payable-generator.ts`

**Função:** `createPayablesFromNFe(nfe, nfeId, organizationId, branchId, partnerId, userId)`

#### **Para cada grupo, cria 1 conta a pagar:**

**Conta 1:**
```sql
INSERT INTO accounts_payable (
  organization_id: 1,
  branch_id: 2,
  partner_id: 45,
  inbound_invoice_id: 789,           ← FK para fiscal_documents
  
  document_number: "NFe 12345-1/4",  ← Numeração sequencial
  description: "Combustível - NFe 12345 - Shell",
  
  category_id: 1,                     ← Combustível
  chart_account_id: 15,               ← 4.1.01.001 - Diesel
  cost_center_id: 3,                  ← CC-001 Operacional
  
  original_amount: 8000.00,
  amount_paid: 0.00,
  balance: 8000.00,
  
  issue_date: "2025-12-10",
  due_date: "2026-01-10",             ← Extrai de <dup>
  
  status: "PENDING",
  origin: "FISCAL_NFE"
)
```

**Conta 2, 3, 4:** Mesmo processo para outros grupos.

---

### **📊 PASSO 6: DETALHAMENTO DOS ITENS**

**Tabela:** `payable_items`

**Para cada item de cada conta:**

```sql
INSERT INTO payable_items (
  payable_id: 123,                   ← FK da conta criada
  
  ncm: "27101251",
  product_code: "123456",
  product_name: "DIESEL S10",
  
  quantity: 1000.00,
  unit: "L",
  unit_price: 5.50,
  total_price: 5500.00,
  
  cfop: "1102",
  icms_base: 5500.00,
  icms_rate: 12.00,
  icms_value: 660.00
)
```

**Uso:** Grid Master-Detail (AG Grid) mostra itens ao expandir linha.

---

## 📊 RESUMO: NFe de Compra

### ✅ O QUE É AUTOMÁTICO:

| Feature | Status | Como Funciona |
|---------|--------|---------------|
| **Parse XML** | ✅ 100% | Extrai todos os dados automaticamente |
| **Classificação Fiscal** | ✅ 100% | PURCHASE, CARGO, RETURN, OTHER |
| **Cadastro Fornecedor** | ✅ 100% | Se não existir, cria automaticamente |
| **Identificação NCM** | ✅ 100% | Extrai NCM de cada item automaticamente |
| **Classificação PCC** | ✅ 80% | Automático se houver regra NCM configurada |
| **Classificação PCG** | ❌ 0% | **NÃO IMPLEMENTADO** |
| **Alocação CC** | ⚠️ 50% | Automático se a regra definir CC |
| **Criação Contas a Pagar** | ✅ 100% | Automático para NFe PURCHASE |
| **Agrupamento por NCM** | ✅ 100% | Agrupa itens da mesma categoria |
| **Extração Vencimento** | ✅ 100% | Lê `<dup>` e `<pag>` automaticamente |

---

<a name="cte"></a>
## 🚚 2. CTe - FLUXO COMPLETO

### **📥 IMPORTAÇÃO CTe**

**Arquivo:** `src/services/sefaz-processor.ts`

**Função:** `importExternalCTe()`

#### **Diferença Importante:**

**CTe tem 2 tipos:**

**1. CTe PRÓPRIO (emitido por nós):**
- ❌ **NÃO é importado da SEFAZ**
- ✅ É criado internamente no sistema (módulo TMS)
- ✅ Gera conta a **RECEBER** automaticamente

**2. CTe EXTERNO (terceiros/redespacho):**
- ✅ **É importado da SEFAZ**
- ✅ É uma **DESPESA** (pagamos frete para terceiro)
- ✅ Deveria gerar conta a **PAGAR**

---

### **📋 FLUXO CTe EXTERNO (Redespacho):**

**1. Importação:**
```typescript
async function importExternalCTe(
  xmlContent: string,
  organizationId: number,
  branchId: number,
  userId: string
): Promise<"SUCCESS" | "DUPLICATE">
```

**2. Parse do XML:**
```typescript
const parsedCTe = {
  cteNumber: "000123",
  cteSeries: "1",
  accessKey: "35251234567890...",
  
  shipper: { cnpj, name, address },     // Remetente
  recipient: { cnpj, name, address },   // Destinatário
  carrier: { cnpj, name, address },     // Transportador (emissor)
  
  freight: {
    value: 1500.00,
    paymentType: "CIF"  // ou "FOB"
  },
  
  cargo: {
    weight: 10000.00,
    value: 50000.00,
    product: "DIESEL"
  }
}
```

**3. Classificação:**
```typescript
// Se TOMADOR = 0 (Remetente paga)
//   E Remetente = Nosso CNPJ
//     → É DESPESA (pagamos frete)

// Se TOMADOR = 1 (Destinatário paga)
//   E Destinatário = Nosso CNPJ
//     → É DESPESA (pagamos frete)

// Senão
//     → É RECEITA (somos o transportador)
```

**4. Armazenamento:**

**Tabela:** `cte_documents`

```sql
INSERT INTO cte_documents (
  organization_id: 1,
  branch_id: 2,
  
  cte_number: "000123",
  cte_series: "1",
  access_key: "35251234567890...",
  
  carrier_cnpj: "12345678000190",
  carrier_name: "Transportadora XYZ",
  
  shipper_cnpj: "98765432000123",
  shipper_name: "Remetente ABC",
  
  freight_value: 1500.00,
  freight_payment_type: "CIF",
  
  is_external: true,              ← CTe de terceiro
  cte_type: "NORMAL",
  
  xml_content: "...",
  status: "ACTIVE"
)
```

---

### **💰 CRIAÇÃO DE CONTAS (CTe):**

#### **CTe PRÓPRIO (receita):**
✅ **Gera conta a RECEBER** automaticamente
- Tabela: `accounts_receivable`
- Categoria: "Receita de Frete"
- PCC: 3.1.01.001 - Frete Próprio

#### **CTe EXTERNO (redespacho):**
⚠️ **STATUS ATUAL:**
- ❌ **NÃO gera conta a pagar automaticamente**
- ⚠️ **Precisa ser implementado**

**Como deveria funcionar:**
```typescript
// Após importar CTe externo:
if (cteType === "EXTERNAL" && weAreThePayer) {
  await createPayableFromCTe(cteData);
  // Categoria: "Frete Pago - Redespacho"
  // PCC: 4.2.01.001
}
```

---

## 📊 RESUMO: CTe

### ✅ O QUE É AUTOMÁTICO:

| Feature | CTe Próprio | CTe Externo |
|---------|-------------|-------------|
| **Parse XML** | ✅ 100% | ✅ 100% |
| **Importação SEFAZ** | ❌ N/A | ✅ 100% |
| **Classificação** | ✅ 100% | ✅ 100% |
| **Identificação NCM** | ❌ N/A | ❌ N/A (CTe não tem NCM) |
| **Classificação PCC** | ✅ 100% | ⚠️ **FIXO** (sem regras) |
| **Classificação PCG** | ❌ 0% | ❌ 0% |
| **Alocação CC** | ⚠️ Manual | ⚠️ Manual |
| **Criação Conta Receber** | ✅ 100% | ❌ N/A |
| **Criação Conta Pagar** | ❌ N/A | ❌ **NÃO IMPLEMENTADO** |

---

<a name="classificacao"></a>
## 🧠 3. CLASSIFICAÇÃO AUTOMÁTICA - ANÁLISE DETALHADA

### **📊 Matriz de Classificação Configurada:**

**Arquivo:** Seeds de dados (migração 0023)

| NCM | Descrição | Categoria | PCC | PCG | CC | Prioridade |
|-----|-----------|-----------|-----|-----|----|-----------:|
| **27101251** | Diesel S10 | Combustível | 4.1.01.001 | ❌ | ⚠️ | 10 ⭐ |
| **27101259** | Diesel S500 | Combustível | 4.1.01.002 | ❌ | ⚠️ | 10 ⭐ |
| **2710\*** | Combustíveis (genérico) | Combustível | 4.1.01.001 | ❌ | ⚠️ | 50 |
| **31021010** | Arla 32 | Aditivos | 4.1.01.003 | ❌ | ⚠️ | 10 ⭐ |
| **27101931** | Óleo Motor | Lubrificantes | 4.1.02.001 | ❌ | ⚠️ | 10 ⭐ |
| **34031900** | Graxa | Lubrificantes | 4.1.02.002 | ❌ | ⚠️ | 10 ⭐ |
| **4011\*** | Pneus (genérico) | Pneus | 4.1.04.001 | ❌ | ⚠️ | 10 ⭐ |
| **8708\*** | Peças Veículos | Peças | 4.1.03.001 | ❌ | ⚠️ | 20 |
| **8481\*** | Válvulas | Peças | 4.1.03.001 | ❌ | ⚠️ | 20 |

**Legenda:**
- ⭐ = Match exato (alta prioridade)
- \* = Wildcard (match por prefixo)
- ❌ = Não implementado
- ⚠️ = Implementação parcial (depende da regra)

---

### **🔍 Como o Motor Busca a Regra:**

**Algoritmo (por prioridade crescente):**

```typescript
1. Buscar por NCM EXATO (27101251)
   ├─ Prioridade 10
   └─ Match: Diesel S10 → 4.1.01.001

2. Se não achou, buscar por NCM WILDCARD (2710*)
   ├─ Prioridade 50
   └─ Match: Qualquer combustível → 4.1.01.001

3. Se não achou, buscar por FORNECEDOR
   ├─ Prioridade 30
   └─ Match: Shell → Sempre Combustível

4. Se não achou, buscar por CFOP
   ├─ Prioridade 40
   └─ Match: 1102 → Compra para comercialização

5. Se não achou, buscar por PALAVRA-CHAVE
   ├─ Prioridade 70
   └─ Match: "DIESEL" no nome → Combustível

6. Se NÃO ACHOU NADA
   └─ Retorna NULL (item não classificado)
```

**Resultado se NULL:**
- ⚠️ Item fica **sem categoria**
- ⚠️ Conta a pagar é criada **SEM PCC**
- ⚠️ Requer classificação **MANUAL**

---

### **📋 Status Atual da Classificação:**

#### **✅ O QUE ESTÁ IMPLEMENTADO:**

**1. Classificação por NCM (PCC):**
- ✅ Match exato
- ✅ Match wildcard
- ✅ Priorização
- ✅ 11 regras principais configuradas
- ✅ Combustível, Lubrificantes, Pneus, Peças, Aditivos

**2. Agrupamento:**
- ✅ Agrupa itens da mesma categoria
- ✅ 1 conta a pagar por categoria
- ✅ Detalhamento completo de itens

**3. Integração:**
- ✅ 100% automático na importação SEFAZ
- ✅ Funciona com Upload manual
- ✅ Auto-cadastro de fornecedor

---

#### **❌ O QUE NÃO ESTÁ IMPLEMENTADO:**

**1. Classificação PCG (Plano de Contas Gerencial):**
- ❌ Tabela existe mas não é usada
- ❌ Não há campo `pcg_account_id` em `accounts_payable`
- ❌ Não há regras configuradas

**2. Alocação Automática de Centro de Custo:**
- ⚠️ **Implementação Parcial**
- ✅ A regra **pode** definir um CC
- ⚠️ Mas **poucas regras** têm CC configurado
- ⚠️ Maioria fica **NULL**

**3. CTe → Conta a Pagar:**
- ❌ CTe externo não gera conta a pagar
- ❌ Não há gerador de contas para CTe
- ❌ Precisa ser criado manualmente

**4. Rateio Proporcional:**
- ❌ Não faz rateio de despesas acessórias
- ❌ IPI, Frete, Seguro não são distribuídos
- ⚠️ Vai apenas no valor total da NFe

---

<a name="estrutura"></a>
## 🗄️ 4. ESTRUTURA DE DADOS

### **📊 Tabelas Principais:**

#### **1. `fiscal_documents`** (Documentos Fiscais)
```sql
Armazena NFes e CTes importados

Campos principais:
- document_type: "NFE" ou "CTE"
- fiscal_classification: PURCHASE, CARGO, RETURN, SALE, OTHER
- fiscal_status: CLASSIFIED, PENDING_CLASSIFICATION
- accounting_status: PENDING, PROCESSED
- financial_status: NO_TITLE, PENDING_PAYMENT, PAID
- partner_id: FK → business_partners
- xml_content: XML completo
```

#### **2. `accounts_payable`** (Contas a Pagar)
```sql
Uma conta pode ter múltiplos itens (payable_items)

Campos principais:
- inbound_invoice_id: FK → fiscal_documents (NFe)
- category_id: FK → financial_categories
- chart_account_id: FK → chart_of_accounts (PCC)
- cost_center_id: FK → cost_centers
- original_amount, amount_paid, balance
- status: PENDING, PAID, OVERDUE, CANCELLED
- origin: "FISCAL_NFE", "FISCAL_CTE", "MANUAL"
```

#### **3. `payable_items`** (Detalhamento)
```sql
Armazena cada item da NFe vinculado à conta

Campos principais:
- payable_id: FK → accounts_payable
- ncm, product_name, quantity, unit_price, total_price
- cfop, icms_base, icms_rate, icms_value
```

#### **4. `auto_classification_rules`** (Matriz de Classificação)
```sql
Regras NCM → Categoria + PCC

Campos principais:
- match_type: NCM, NCM_WILDCARD, CFOP, SUPPLIER, KEYWORD
- ncm_code: "27101251" ou "2710*"
- category_id: FK → financial_categories
- chart_account_id: FK → chart_of_accounts
- cost_center_id: FK → cost_centers (opcional)
- priority: número (menor = mais importante)
```

#### **5. `chart_of_accounts`** (PCC - Plano de Contas Contábil)
```sql
Plano de contas padrão

Campos principais:
- code: "4.1.01.001"
- name: "Diesel S10"
- type: REVENUE, EXPENSE, ASSET, LIABILITY
- category: OPERATIONAL_OWN_FLEET, etc
- is_analytical: "true" (recebe lançamento)
- requires_cost_center: "true"
```

#### **6. `management_chart_of_accounts`** (PCG - Plano Gerencial)
```sql
Existe mas NÃO é usado na importação

Campos principais:
- code: "G-1000"
- name: "Custo Gerencial Diesel"
- type: EXPENSE, REVENUE, RESULT
- allocation_rule: KM_RODADO, TIPO_VEICULO, ROTA
```

#### **7. `cost_centers`** (Centros de Custo)
```sql
Centros de custo 3D

Campos principais:
- code: "CC-001"
- name: "Operacional - Frota Própria"
- type: OPERATIONAL, ADMINISTRATIVE, SUPPORT
- class: COST, REVENUE, BOTH
- (dimensões 3D): division, area, region, function, activity, project
```

---

### **🔗 Relacionamentos:**

```
fiscal_documents (NFe)
  ↓ (1:N)
accounts_payable (Contas)
  ↓ (1:N)
payable_items (Itens)

accounts_payable
  ↓ (N:1)
financial_categories (Categoria)
  
accounts_payable
  ↓ (N:1)
chart_of_accounts (PCC)

accounts_payable
  ↓ (N:1)
cost_centers (CC)
```

---

<a name="diagrama"></a>
## 📊 5. DIAGRAMA DE FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│                    IMPORTAÇÃO XML NFe/CTe                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  XML NFe/CTe     │
│  (SEFAZ/Upload)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ 1. PARSE XML                                  │
│    ├─ Extrai: Fornecedor, Itens, Valores     │
│    ├─ NCM de cada item                       │
│    └─ Parcelas/vencimentos                   │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ 2. CLASSIFICAÇÃO FISCAL                       │
│    ├─ PURCHASE (compra) ──────────┐          │
│    ├─ CARGO (transporte)          │          │
│    ├─ RETURN (devolução)          │          │
│    ├─ SALE (venda)                │          │
│    └─ OTHER (não identificado)    │          │
└──────────────────────────────────┬┘          │
                                   │           │
                         ┌─────────▼──────┐    │
                         │ Se PURCHASE:   │◄───┘
                         │ Continua...    │
                         └─────────┬──────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────┐
│ 3. AUTO-CADASTRO FORNECEDOR (se não existir) │
│    ✅ Cria automaticamente na base           │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ 4. INSERE DOCUMENTO FISCAL                    │
│    Tabela: fiscal_documents                   │
│    ├─ fiscal_status: CLASSIFIED              │
│    ├─ accounting_status: PENDING             │
│    └─ financial_status: NO_TITLE             │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ 5. CLASSIFICAÇÃO CONTÁBIL (cada item)        │
│    Motor: classification-engine.ts           │
│                                              │
│    Para cada item da NFe:                    │
│    ├─ Busca regra por NCM (prioridade)      │
│    ├─ Match: NCM exato > Wildcard > Padrão  │
│    └─ Retorna:                               │
│       ├─ ✅ Categoria (Combustível)          │
│       ├─ ✅ PCC (4.1.01.001)                 │
│       ├─ ❌ PCG (não implementado)           │
│       └─ ⚠️ CC (se regra definir)            │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ 6. AGRUPAMENTO POR CATEGORIA                 │
│    Função: groupItemsByCategory()            │
│                                              │
│    Exemplo:                                  │
│    NFe com 5 itens:                          │
│    ├─ 2 Diesel   ───┐                       │
│    ├─ 1 Óleo     ───┼─→ 4 GRUPOS            │
│    ├─ 1 Arla     ───┤                       │
│    └─ 1 Pneu     ───┘                       │
│                                              │
│    Resultado: 4 contas a pagar               │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ 7. CRIAÇÃO CONTAS A PAGAR                     │
│    Função: createPayablesFromNFe()           │
│                                              │
│    Para cada grupo:                          │
│    ├─ INSERT INTO accounts_payable           │
│    │  ├─ category_id ✅                      │
│    │  ├─ chart_account_id ✅ (PCC)           │
│    │  ├─ cost_center_id ⚠️ (se existir)      │
│    │  ├─ inbound_invoice_id ✅               │
│    │  ├─ original_amount ✅                   │
│    │  ├─ due_date ✅ (de <dup>)              │
│    │  ├─ status: "PENDING" ✅                │
│    │  └─ origin: "FISCAL_NFE" ✅             │
│    │                                         │
│    └─ Para cada item do grupo:              │
│       └─ INSERT INTO payable_items           │
│          ├─ payable_id ✅                    │
│          ├─ ncm ✅                            │
│          ├─ product_name ✅                   │
│          ├─ quantity ✅                       │
│          ├─ total_price ✅                   │
│          └─ (detalhamento completo)          │
└────────┬─────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ 8. RESULTADO FINAL                            │
│    ✅ NFe importada e classificada           │
│    ✅ Fornecedor cadastrado (se novo)        │
│    ✅ N contas a pagar criadas               │
│    ✅ Categoria correta em cada conta        │
│    ✅ PCC correto em cada conta              │
│    ✅ Detalhamento de itens salvo            │
│    ⚠️ PCG não implementado                   │
│    ⚠️ CC parcialmente implementado           │
│    ✅ Pronto para pagamento!                 │
└──────────────────────────────────────────────┘
```

---

## 📋 CHECKLIST: O QUE É AUTOMÁTICO vs MANUAL

### **NFe de Compra:**

| Funcionalidade | Status | Automático? | Observação |
|----------------|--------|-------------|------------|
| Parse XML | ✅ | 100% | Extrai todos os dados |
| Cadastro Fornecedor | ✅ | 100% | Se não existir, cria |
| Classificação Fiscal | ✅ | 100% | PURCHASE, CARGO, etc |
| **Identificação NCM** | ✅ | **100%** | ✅ **Extrai de cada item** |
| **Classificação PCC** | ⚠️ | **80%** | ✅ **Se houver regra configurada** |
| Classificação PCG | ❌ | 0% | ❌ **Não implementado** |
| Alocação CC | ⚠️ | 50% | ⚠️ **Se a regra definir** |
| **Criação Contas a Pagar** | ✅ | **100%** | ✅ **Automático para PURCHASE** |
| Agrupamento por Categoria | ✅ | 100% | Agrupa itens do mesmo NCM |
| Detalhamento Itens | ✅ | 100% | Salva todos os itens |
| Extração Vencimento | ✅ | 100% | Lê `<dup>` e `<pag>` |
| Rateio Despesas Acessórias | ❌ | 0% | IPI, Frete, Seguro não são rateados |

### **CTe:**

| Funcionalidade | Próprio | Externo |
|----------------|---------|---------|
| Parse XML | ✅ 100% | ✅ 100% |
| Importação SEFAZ | ❌ N/A | ✅ 100% |
| Classificação | ✅ 100% | ✅ 100% |
| Identificação NCM | ❌ N/A | ❌ N/A |
| Classificação PCC | ✅ 100% | ⚠️ Fixo |
| Classificação PCG | ❌ 0% | ❌ 0% |
| Alocação CC | ⚠️ Manual | ⚠️ Manual |
| Criação Conta Receber | ✅ 100% | ❌ N/A |
| **Criação Conta Pagar** | ❌ N/A | ❌ **NÃO IMPLEMENTADO** |

---

## 🎯 CONCLUSÃO E RECOMENDAÇÕES

### ✅ **PONTOS FORTES:**

1. ✅ **Sistema de classificação bem arquitetado**
2. ✅ **Agrupamento por NCM funcional**
3. ✅ **Integração 100% automática**
4. ✅ **11 regras principais configuradas**
5. ✅ **Detalhamento completo de itens**
6. ✅ **Auto-cadastro de fornecedores**

### ⚠️ **PONTOS DE ATENÇÃO:**

1. ⚠️ **PCG não está sendo usado** (existe mas não integra)
2. ⚠️ **CC parcialmente implementado** (maioria fica NULL)
3. ⚠️ **CTe externo não gera conta a pagar**
4. ⚠️ **Poucas regras NCM configuradas** (apenas 11)
5. ⚠️ **Sem rateio de despesas acessórias**

### 🚀 **RECOMENDAÇÕES DE MELHORIA:**

#### **Curto Prazo (Alta Prioridade):**

1. **Adicionar mais regras NCM:**
   - Configurar 50-100 NCMs mais comuns
   - Validar com histórico de compras
   - Priorizar: Combustível, Peças, Pneus, Manutenção

2. **Implementar CTe → Conta a Pagar:**
   - Criar `createPayableFromCTe()`
   - Integrar com `importExternalCTe()`
   - Categoria fixa: "Frete Pago - Redespacho"

3. **Definir CC nas regras existentes:**
   - Combustível → CC-001 Operacional
   - Peças → CC-002 Manutenção
   - Administrativo → CC-003 Admin

#### **Médio Prazo:**

4. **Integrar PCG:**
   - Adicionar `pcg_account_id` em `accounts_payable`
   - Criar regras de classificação PCG
   - Mapear PCC → PCG automaticamente

5. **Rateio de Despesas:**
   - IPI, Frete, Seguro distribuídos proporcionalmente
   - Agregar no valor de cada item

6. **Dashboard de Monitoramento:**
   - Itens sem classificação
   - Novas NCMs detectadas
   - Taxa de sucesso de classificação

#### **Longo Prazo:**

7. **Machine Learning:**
   - Aprender classificações do usuário
   - Sugerir regras automaticamente
   - Melhorar com o tempo

---

**Autor:** Sistema Aura Core  
**Data:** 11/12/2025  
**Versão:** 1.0  
**Status:** ✅ Análise Completa






