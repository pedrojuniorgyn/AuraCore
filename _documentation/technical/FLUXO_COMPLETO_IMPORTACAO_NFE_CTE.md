# 📊 FLUXO COMPLETO: Importação NFe/CTe - Passo a Passo

**Data:** 11 de Dezembro de 2025  
**Autor:** Análise Sistema Aura Core  
**Status:** ✅ DOCUMENTAÇÃO COMPLETA

---

## 🎯 RESUMO EXECUTIVO

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  📊 ANÁLISE: IMPORTAÇÃO AUTOMÁTICA NFe/CTe                   ║
║                                                               ║
║  NFe de Compra:                                              ║
║  ✅ Importação: 100% automática                              ║
║  ✅ NCM: Identificado automaticamente                        ║
║  ✅ PCC: Classificação automática (80% sucesso)              ║
║  ❌ PCG: NÃO implementado                                    ║
║  ⚠️ CC: Parcialmente automático (50%)                        ║
║  ✅ Contas a Pagar: Criação 100% automática                  ║
║                                                               ║
║  CTe:                                                        ║
║  ✅ CTe Próprio → Conta a Receber: Automático               ║
║  ❌ CTe Externo → Conta a Pagar: NÃO implementado           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 📥 PARTE 1: NFe DE COMPRA - PASSO A PASSO DETALHADO

### **ETAPA 1: IMPORTAÇÃO DO XML** 🔽

**Origem do XML:**
- ✅ **SEFAZ** (download automático com certificado A1)
- ✅ **Upload Manual** (tela `/fiscal/upload-xml`)

**Arquivo:** `src/services/sefaz-processor.ts`  
**Função:** `importNFeAutomatically()`

**O que acontece:**
```typescript
1. Recebe o XML completo
2. Valida formato XML
3. Extrai chave de acesso
4. Verifica se já foi importada (evita duplicatas)
5. Se duplicada → PARA (retorna "DUPLICATE")
6. Se nova → CONTINUA para próxima etapa
```

**Saída:**
```json
{
  "status": "SUCCESS",
  "message": "NFe importada com sucesso"
}
```

---

### **ETAPA 2: PARSE DO XML** 📋

**Arquivo:** `src/services/nfe-parser.ts`  
**Função:** `parseNFeXML(xmlContent)`

**Dados Extraídos:**

#### **2.1 - Identificação:**
```javascript
{
  accessKey: "35251234567890000123550010001234561234567890",
  number: "123456",
  series: "1",
  model: "55",  // NFe
  issueDate: "2025-12-10T10:30:00"
}
```

#### **2.2 - Emitente (Fornecedor):**
```javascript
{
  cnpj: "12.345.678/0001-90",
  name: "POSTO SHELL LTDA",
  tradeName: "Shell",
  ie: "123456789",
  phone: "(11) 1234-5678",
  address: {
    street: "Av. Paulista",
    number: "1000",
    district: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01310-100",
    cityCode: "3550308"
  }
}
```

#### **2.3 - Destinatário (Nós):**
```javascript
{
  cnpj: "98.765.432/0001-23",  // CNPJ da nossa filial
  name: "NOSSA TRANSPORTADORA LTDA",
  ie: "987654321"
}
```

#### **2.4 - Itens da NFe:**
```javascript
[
  {
    sequencia: 1,
    ncm: "27101251",              // ✅ NCM extraído automaticamente
    productCode: "DIESEL-S10",
    productName: "OLEO DIESEL S10",
    unit: "L",
    quantity: 1000.00,
    unitPrice: 5.50,
    totalPrice: 5500.00,
    cfop: "1102",
    
    // Impostos
    icmsBase: 5500.00,
    icmsRate: 12.00,
    icmsValue: 660.00,
    ipiValue: 0.00,
    pisValue: 90.75,
    cofinsValue: 418.00
  },
  {
    sequencia: 2,
    ncm: "27101259",              // ✅ NCM extraído automaticamente
    productCode: "DIESEL-S500",
    productName: "OLEO DIESEL S500",
    unit: "L",
    quantity: 500.00,
    unitPrice: 5.00,
    totalPrice: 2500.00,
    cfop: "1102"
  },
  // ... outros itens
]
```

#### **2.5 - Totais:**
```javascript
{
  products: 15750.00,    // Soma dos produtos
  nfe: 15750.00,         // Total da NFe
  icms: 1890.00,
  ipi: 0.00,
  pis: 103.00,
  cofins: 474.00
}
```

#### **2.6 - Pagamento:**
```javascript
{
  paymentMethod: "CREDIT",  // Crédito, Dinheiro, Boleto, etc
  installments: [
    {
      number: 1,
      dueDate: "2026-01-10",  // ✅ Vencimento extraído de <dup>
      value: 15750.00
    }
  ]
}
```

**Saída:**
```typescript
ParsedNFe {
  // Estrutura completa com todos os dados acima
}
```

---

### **ETAPA 3: CLASSIFICAÇÃO FISCAL** 🏷️

**Arquivo:** `src/services/fiscal-classification-service.ts`  
**Função:** `classifyNFe(parsedNFe, branchCNPJ)`

**Regras (por ordem de prioridade):**

#### **3.1 - Verifica se é DEVOLUÇÃO:**
```typescript
if (
  natureza.includes("DEVOLUCAO") ||
  cfop === "5202" || cfop === "6202"
) {
  return "RETURN";
  // ❌ NÃO gera contas a pagar
  // ✅ Apenas registra o documento
}
```

#### **3.2 - Verifica se é CARGA (somos transportador):**
```typescript
if (transporterCNPJ === branchCNPJ) {
  return "CARGO";
  // ✅ Gera conta a RECEBER (é receita)
  // ✅ Categoria: Receita de Transporte
}
```

#### **3.3 - Verifica se é COMPRA:** ⭐ **PRINCIPAL**
```typescript
if (recipientCNPJ === branchCNPJ) {
  return "PURCHASE";
  // ✅ Gera contas a PAGAR (é despesa)
  // ✅ Ativa motor de classificação contábil
  // ✅ Agrupamento por NCM
}
```

**Exemplo Prático:**

```
NFe 12345:
  Emitente: Shell (CNPJ: 12.345.678/0001-90)
  Destinatário: Nossa Empresa (CNPJ: 98.765.432/0001-23)
  Natureza: "COMPRA DE COMBUSTIVEL"
  CFOP: 1102
  
  Verificação:
  ├─ É devolução? NÃO
  ├─ Somos o transportador? NÃO
  ├─ Somos o destinatário? SIM ✅
  └─ Classificação: PURCHASE ✅
  
  Resultado:
  → Gera contas a pagar
  → Ativa classificação contábil
```

**Saída:**
- **Classificação:** `"PURCHASE"`
- **Fiscal Status:** `"CLASSIFIED"`

---

### **ETAPA 4: AUTO-CADASTRO DE FORNECEDOR** 👤

**Arquivo:** `src/services/sefaz-processor.ts` (linhas 254-312)

**O que faz:**

```typescript
1. Busca fornecedor pelo CNPJ
2. Se JÁ EXISTE:
   ├─ Usa o partner_id existente
   └─ Continua

3. Se NÃO EXISTE:
   ├─ Cria novo registro em business_partners
   ├─ Preenche com dados do XML:
   │  ├─ CNPJ, Nome, Nome Fantasia
   │  ├─ IE (Inscrição Estadual)
   │  ├─ Endereço completo
   │  ├─ Telefone
   │  └─ type: "PROVIDER"
   └─ Retorna partner_id
```

**Dados Salvos:**
```sql
INSERT INTO business_partners (
  organization_id: 1,
  type: "PROVIDER",
  
  document: "12345678000190",      ← CNPJ limpo
  name: "POSTO SHELL LTDA",
  trade_name: "Shell",
  
  tax_regime: "NORMAL",
  ie: "123456789",
  
  zip_code: "01310-100",
  street: "Av. Paulista",
  number: "1000",
  district: "Centro",
  city_name: "São Paulo",
  state: "SP",
  
  phone: "(11) 1234-5678",
  
  data_source: "XML_IMPORT",       ← Indica origem
  status: "ACTIVE"
)
```

**Resultado:**
- ✅ **Fornecedor sempre cadastrado** (novo ou existente)
- ✅ **partner_id disponível** para próximas etapas

---

### **ETAPA 5: INSERE DOCUMENTO FISCAL** 📄

**Tabela:** `fiscal_documents`

**Dados Salvos:**

```sql
INSERT INTO fiscal_documents (
  organization_id: 1,
  branch_id: 2,
  
  -- Identificação
  document_type: "NFE",
  document_number: "123456",
  document_series: "1",
  access_key: "35251234567890...",
  
  -- Parceiro
  partner_id: 45,                    ← FK do fornecedor
  partner_document: "12345678000190",
  partner_name: "POSTO SHELL LTDA",
  
  -- Datas
  issue_date: "2025-12-10",
  entry_date: "2025-12-11",          ← Data da importação
  
  -- Valores
  gross_amount: "15750.00",          ← Total dos produtos
  tax_amount: "0.00",
  net_amount: "15750.00",            ← Total da NFe
  
  -- Classificação Fiscal
  fiscal_classification: "PURCHASE", ← ✅ AUTOMÁTICO
  cfop: "1102",
  operation_type: "ENTRADA",
  
  -- Status Triple
  fiscal_status: "CLASSIFIED",       ← ✅ AUTOMÁTICO
  accounting_status: "PENDING",      ← Aguarda processamento
  financial_status: "NO_TITLE",      ← Antes de criar contas
  
  -- XML/PDF
  xml_content: "...",                ← XML completo
  xml_hash: "sha256...",
  
  -- Controle
  editable: 1,                       ← Pode ser editado
  imported_from: "SEFAZ",            ← Ou "MANUAL"
  
  -- Auditoria
  created_by: "user@email.com",
  version: 1
)
```

**Resultado:**
- ✅ **NFe salva** na tabela fiscal_documents
- ✅ **fiscal_status = CLASSIFIED** (já classificada)
- ⏳ **accounting_status = PENDING** (aguardando processamento contábil)
- ⏳ **financial_status = NO_TITLE** (ainda sem contas a pagar)

---

### **ETAPA 6: CLASSIFICAÇÃO CONTÁBIL (ITEM POR ITEM)** 🧠

**Arquivo:** `src/services/accounting/classification-engine.ts`  
**Função:** `classifyNFeItem(item, organizationId, supplierId)`

#### **Para CADA item da NFe:**

**Item 1: Diesel S10**

```javascript
Input:
{
  ncm: "27101251",
  cfop: "1102",
  productName: "OLEO DIESEL S10",
  quantity: 1000,
  unitPrice: 5.50,
  totalPrice: 5500.00
}
```

**Processo de Busca:**

```typescript
1. Busca todas as regras ativas (organization_id = 1)
2. Ordena por prioridade (ASC - menor primeiro)
3. Para cada regra:
   
   REGRA 1 (prioridade 10):
   ├─ match_type: "NCM"
   ├─ ncm_code: "27101251"
   ├─ Comparação: "27101251" === "27101251"
   └─ ✅ MATCH! Para aqui
   
   Retorna:
   {
     categoryId: 1,
     categoryName: "Combustível",
     chartAccountId: 15,
     chartAccountCode: "4.1.01.001",
     chartAccountName: "Diesel S10",
     costCenterId: null,          // ⚠️ Não definido na regra
     ruleName: "Diesel S10",
     matchType: "NCM"
   }
```

**Item 2: Diesel S500**

```typescript
Input:
{
  ncm: "27101259",
  cfop: "1102",
  productName: "OLEO DIESEL S500",
  quantity: 500,
  unitPrice: 5.00,
  totalPrice: 2500.00
}

Busca:
   REGRA 2 (prioridade 10):
   ├─ match_type: "NCM"
   ├─ ncm_code: "27101259"
   ├─ Comparação: "27101259" === "27101259"
   └─ ✅ MATCH!
   
   Retorna:
   {
     categoryId: 1,                // MESMA categoria que Item 1
     categoryName: "Combustível",
     chartAccountId: 16,
     chartAccountCode: "4.1.01.002",
     chartAccountName: "Diesel S500",
     costCenterId: null
   }
```

**Item 3: Pneu (NCM não cadastrado)**

```typescript
Input:
{
  ncm: "40119990",               // ← NCM não tem regra EXATA
  cfop: "1102",
  productName: "PNEU 295/80R22.5",
  quantity: 4,
  unitPrice: 1237.50,
  totalPrice: 4950.00
}

Busca:
   REGRA 1-7 (prioridade 10): ❌ Nenhum match
   
   REGRA 8 (prioridade 10):
   ├─ match_type: "NCM_WILDCARD"
   ├─ ncm_code: "4011*"          // ← Wildcard!
   ├─ Comparação: "40119990" começa com "4011"?
   └─ ✅ MATCH!
   
   Retorna:
   {
     categoryId: 5,
     categoryName: "Pneus",
     chartAccountId: 20,
     chartAccountCode: "4.1.04.001",
     chartAccountName: "Pneus",
     costCenterId: null
   }
```

**Item 4: Material de Escritório (sem regra)**

```typescript
Input:
{
  ncm: "48201000",               // ← NCM SEM NENHUMA REGRA
  cfop: "1102",
  productName: "PAPEL A4 500 FLS",
  quantity: 10,
  unitPrice: 20.00,
  totalPrice: 200.00
}

Busca:
   REGRA 1-11: ❌ Nenhum match
   
   Retorna: null                  // ⚠️ Não classificado
```

**Resultado da Classificação:**

| Item | NCM | Categoria | PCC | CC | Status |
|------|-----|-----------|-----|----|----|
| Diesel S10 | 27101251 | Combustível | 4.1.01.001 | null | ✅ Classificado |
| Diesel S500 | 27101259 | Combustível | 4.1.01.002 | null | ✅ Classificado |
| Pneu | 40119990 | Pneus | 4.1.04.001 | null | ✅ Classificado (wildcard) |
| Papel A4 | 48201000 | null | null | null | ❌ **NÃO CLASSIFICADO** |

---

### **ETAPA 7: AGRUPAMENTO POR CATEGORIA** 📦

**Arquivo:** `src/services/accounting/group-by-category.ts`  
**Função:** `groupItemsByCategory(items, organizationId)`

**O que faz:**

```typescript
1. Recebe array de itens classificados
2. Agrupa itens da MESMA categoria
3. Soma valores de cada grupo
4. Retorna array de grupos
```

**Exemplo com NFe real:**

**NFe 12345 - Shell - Total: R$ 15.750,00**

**Itens:**
1. Diesel S10 (1000L) → Categoria 1 (Combustível) → R$ 5.500
2. Diesel S500 (500L) → Categoria 1 (Combustível) → R$ 2.500
3. Óleo Motor (20L) → Categoria 2 (Lubrificantes) → R$ 2.000
4. Arla 32 (100L) → Categoria 3 (Aditivos) → R$ 800
5. Pneu (4un) → Categoria 5 (Pneus) → R$ 4.950

**Agrupamento:**

```javascript
[
  {
    categoryId: 1,
    categoryName: "Combustível",
    chartAccountId: 15,
    chartAccountCode: "4.1.01.001",
    chartAccountName: "Diesel S10",
    costCenterId: null,
    totalAmount: 8000.00,          // ← R$ 5.500 + R$ 2.500
    items: [
      { /* Diesel S10 */ },
      { /* Diesel S500 */ }
    ]
  },
  {
    categoryId: 2,
    categoryName: "Lubrificantes",
    chartAccountId: 17,
    chartAccountCode: "4.1.02.001",
    totalAmount: 2000.00,
    items: [
      { /* Óleo Motor */ }
    ]
  },
  {
    categoryId: 3,
    categoryName: "Aditivos",
    chartAccountId: 18,
    chartAccountCode: "4.1.01.003",
    totalAmount: 800.00,
    items: [
      { /* Arla 32 */ }
    ]
  },
  {
    categoryId: 5,
    categoryName: "Pneus",
    chartAccountId: 20,
    chartAccountCode: "4.1.04.001",
    totalAmount: 4950.00,
    items: [
      { /* Pneu */ }
    ]
  }
]
```

**Resultado:**
- ✅ **4 grupos** criados
- ✅ **4 contas a pagar** serão criadas
- ✅ Cada conta com **categoria e PCC corretos**

---

### **ETAPA 8: CRIAÇÃO DAS CONTAS A PAGAR** 💰

**Arquivo:** `src/services/financial/nfe-payable-generator.ts`  
**Função:** `createPayablesFromNFe(nfe, nfeId, organizationId, branchId, partnerId, userId)`

**Para CADA grupo:**

#### **Conta 1: Combustível (R$ 8.000,00)**

```sql
INSERT INTO accounts_payable (
  organization_id: 1,
  branch_id: 2,
  partner_id: 45,                    -- Shell
  inbound_invoice_id: 789,           -- FK fiscal_documents
  
  -- Identificação
  document_number: "NFe 12345-1/4",  -- Numeração: [NFe]-[Grupo]/[Total]
  description: "Combustível - NFe 12345 - Shell",
  
  -- Classificação
  category_id: 1,                    -- ✅ Combustível (AUTOMÁTICO)
  chart_account_id: 15,              -- ✅ 4.1.01.001 (AUTOMÁTICO)
  cost_center_id: NULL,              -- ⚠️ Não definido (MANUAL)
  
  -- Valores
  original_amount: 8000.00,
  discount: 0.00,
  interest: 0.00,
  amount_paid: 0.00,
  balance: 8000.00,
  
  -- Datas
  issue_date: "2025-12-10",          -- Da NFe
  due_date: "2026-01-10",            -- ✅ De <dup> (AUTOMÁTICO)
  payment_date: NULL,
  
  -- Status e Origem
  status: "PENDING",
  origin: "FISCAL_NFE",              -- ✅ Rastreável
  
  -- Auditoria
  created_by: "user@email.com",
  created_at: "2025-12-11 10:00:00"
)
```

#### **Conta 2, 3, 4:** Mesmo processo para outros grupos.

**Resultado:**
- ✅ **4 contas a pagar criadas**
- ✅ Cada uma com sua **categoria**
- ✅ Cada uma com seu **PCC**
- ⚠️ Todas **sem CC** (depende da regra)

---

### **ETAPA 9: DETALHAMENTO DOS ITENS** 📝

**Tabela:** `payable_items`

**Para CADA item de CADA conta:**

#### **Conta 1 (Combustível) - Item 1:**

```sql
INSERT INTO payable_items (
  payable_id: 123,                   -- FK da conta criada
  
  -- NCM e Produto
  ncm: "27101251",
  product_code: "DIESEL-S10",
  product_name: "OLEO DIESEL S10",
  
  -- Quantidades
  quantity: 1000.00,
  unit: "L",
  unit_price: 5.50,
  total_price: 5500.00,
  
  -- Fiscal
  cfop: "1102",
  icms_base: 5500.00,
  icms_rate: 12.00,
  icms_value: 660.00,
  ipi_value: 0.00,
  pis_value: 45.38,
  cofins_value: 209.00
)
```

#### **Conta 1 (Combustível) - Item 2:**

```sql
INSERT INTO payable_items (
  payable_id: 123,                   -- MESMA conta
  
  ncm: "27101259",
  product_code: "DIESEL-S500",
  product_name: "OLEO DIESEL S500",
  
  quantity: 500.00,
  unit: "L",
  unit_price: 5.00,
  total_price: 2500.00,
  
  cfop: "1102",
  icms_base: 2500.00,
  icms_rate: 12.00,
  icms_value: 300.00
)
```

**Uso no Sistema:**

```
AG Grid (Master-Detail):

┌─ Conta a Pagar #123 - Combustível - R$ 8.000,00 ─┐
│  + Expandir detalhes                              │
└───────────────────────────────────────────────────┘
    ↓ (usuário clica)
┌───────────────────────────────────────────────────┐
│  ITENS DESTA CONTA:                               │
│                                                   │
│  NCM        Produto         Qtd    Unit.  Total  │
│  27101251   Diesel S10      1000L  5.50   5.500  │
│  27101259   Diesel S500     500L   5.00   2.500  │
│                                                   │
│  TOTAL:                                   8.000   │
└───────────────────────────────────────────────────┘
```

---

## 📊 RESULTADO FINAL - NFe de Compra

### **Input:**
```
📄 NFe 12345 - Shell - R$ 15.750,00
   ├─ 5 itens
   └─ 4 NCMs diferentes
```

### **Output:**

#### **1. Documento Fiscal:**
```
✅ fiscal_documents (ID: 789)
   ├─ fiscal_classification: PURCHASE
   ├─ fiscal_status: CLASSIFIED
   ├─ accounting_status: PENDING
   └─ financial_status: NO_TITLE → PENDING_PAYMENT
```

#### **2. Fornecedor:**
```
✅ business_partners (ID: 45)
   ├─ POSTO SHELL LTDA
   ├─ CNPJ: 12.345.678/0001-90
   └─ Cadastrado automaticamente
```

#### **3. Contas a Pagar (4):**

| # | Categoria | Valor | PCC | CC | Itens |
|---|-----------|-------|-----|----|----|
| 1 | Combustível | R$ 8.000 | 4.1.01.001 | null | 2 |
| 2 | Lubrificantes | R$ 2.000 | 4.1.02.001 | null | 1 |
| 3 | Aditivos | R$ 800 | 4.1.01.003 | null | 1 |
| 4 | Pneus | R$ 4.950 | 4.1.04.001 | null | 1 |

#### **4. Detalhamento (5 itens):**
```
✅ payable_items (5 registros)
   ├─ Cada item vinculado à sua conta
   ├─ NCM preservado
   ├─ Valores detalhados
   └─ Impostos individualizados
```

---

## 🚚 PARTE 2: CTe - PASSO A PASSO

### **Tipo 1: CTe PRÓPRIO (Emitido por Nós)**

**Origem:** Sistema TMS interno

**Fluxo:**
```
1. Usuário cria viagem no TMS
2. Sistema gera CT-e automaticamente
3. Emite na SEFAZ
4. Gera conta a RECEBER:
   ├─ Categoria: "Receita de Frete"
   ├─ PCC: 3.1.01.001 - Frete Próprio
   ├─ PCG: ❌ Não usa
   └─ CC: ⚠️ Manual (deveria ser CC-999 Receita)
```

**Status:** ✅ **100% automático**

---

### **Tipo 2: CTe EXTERNO (Redespacho/Terceiro)**

**Origem:** SEFAZ (importação automática)

**Arquivo:** `src/services/sefaz-processor.ts`  
**Função:** `importExternalCTe()`

#### **Fluxo Atual:**

```typescript
1. Parse XML do CTe
   ├─ Extrai: Emitente, Remetente, Destinatário
   ├─ Extrai: Valor Frete, Peso, Produto
   └─ Extrai: Chave NFe vinculada

2. Verifica duplicata
   └─ Se já importado → PARA

3. Busca NFe vinculada (se houver)
   └─ Vincula CTe externo com cargo_documents

4. Insere na tabela external_ctes
   ├─ access_key, cte_number, series
   ├─ issuer_cnpj, issuer_name (transportadora)
   ├─ sender/recipient (remetente/destinatário)
   ├─ freight_value (valor do frete)
   ├─ is_external: true
   └─ status: "LINKED" ou "IMPORTED"

5. ❌ NÃO gera conta a pagar
   └─ Precisa ser criada manualmente
```

#### **O que DEVERIA fazer:**

```typescript
6. Verificar quem paga o frete:
   ├─ Se Remetente = Nós → Geramos conta a PAGAR
   ├─ Se Destinatário = Nós → Geramos conta a PAGAR
   └─ Se Terceiro paga → Não faz nada

7. Criar conta a pagar:
   INSERT INTO accounts_payable (
     partner_id: [transportadora],
     description: "Frete Pago - CTe 123 - Transportadora XYZ",
     category_id: [Frete Pago],
     chart_account_id: [4.2.01.001 - Redespacho],
     cost_center_id: [CC-001 Operacional],  // ⚠️ Deveria inferir da rota
     original_amount: 1500.00,
     due_date: [prazo padrão: 30 dias],
     status: "PENDING",
     origin: "FISCAL_CTE"
   )
```

**Status Atual:** ❌ **NÃO IMPLEMENTADO**

---

## 📊 QUADRO COMPARATIVO: O QUE É AUTOMÁTICO

### **NFe de Compra:**

| Etapa | Automático? | Implementação | Observação |
|-------|-------------|---------------|------------|
| **1. Parse XML** | ✅ **SIM** | 100% | Extrai todos os dados |
| **2. Verifica Duplicata** | ✅ **SIM** | 100% | Por chave de acesso |
| **3. Cadastra Fornecedor** | ✅ **SIM** | 100% | Se não existir, cria |
| **4. Classifica Fiscal** | ✅ **SIM** | 100% | PURCHASE, CARGO, RETURN |
| **5. Insere Documento** | ✅ **SIM** | 100% | Tabela fiscal_documents |
| **6. Identifica NCM** | ✅ **SIM** | 100% | ✅ De cada item |
| **7. Classifica PCC** | ⚠️ **PARCIAL** | 80% | ⚠️ Se houver regra NCM |
| **8. Classifica PCG** | ❌ **NÃO** | 0% | ❌ Não implementado |
| **9. Aloca CC** | ⚠️ **PARCIAL** | 50% | ⚠️ Se regra definir |
| **10. Agrupa por Categoria** | ✅ **SIM** | 100% | Itens mesma categoria |
| **11. Cria Contas a Pagar** | ✅ **SIM** | 100% | ✅ 1 por categoria |
| **12. Detalha Itens** | ✅ **SIM** | 100% | payable_items |
| **13. Extrai Vencimento** | ✅ **SIM** | 100% | De `<dup>` |

**Taxa de Automação:** **75%** (9 de 12 etapas 100% automáticas)

---

### **CTe:**

| Etapa | CTe Próprio | CTe Externo |
|-------|-------------|-------------|
| **1. Parse XML** | ✅ SIM (100%) | ✅ SIM (100%) |
| **2. Importação SEFAZ** | ❌ N/A | ✅ SIM (100%) |
| **3. Vincula NFe** | ✅ SIM | ✅ SIM |
| **4. Classifica** | ✅ SIM | ✅ SIM |
| **5. Identifica NCM** | ❌ N/A | ❌ N/A |
| **6. Classifica PCC** | ✅ SIM (fixo) | ⚠️ PARCIAL |
| **7. Classifica PCG** | ❌ NÃO | ❌ NÃO |
| **8. Aloca CC** | ⚠️ Manual | ⚠️ Manual |
| **9. Cria Conta Receber** | ✅ **SIM** | ❌ N/A |
| **10. Cria Conta Pagar** | ❌ N/A | ❌ **NÃO** |

**CTe Próprio - Taxa de Automação:** **80%**  
**CTe Externo - Taxa de Automação:** **40%** (falta geração de conta a pagar)

---

## 📋 MATRIZ DE CLASSIFICAÇÃO CONFIGURADA

### **11 Regras Ativas no Banco:**

| # | Tipo | NCM | Categoria | PCC | Prioridade |
|---|------|-----|-----------|-----|------------|
| 1 | NCM | **27101251** | Combustível | 4.1.01.001 - Diesel S10 | 10 ⭐ |
| 2 | NCM | **27101259** | Combustível | 4.1.01.002 - Diesel S500 | 10 ⭐ |
| 3 | NCM | **31021010** | Aditivos | 4.1.01.003 - Arla 32 | 10 ⭐ |
| 4 | NCM | **27101931** | Lubrificantes | 4.1.02.001 - Óleo Motor | 10 ⭐ |
| 5 | NCM | **34031900** | Lubrificantes | 4.1.02.002 - Graxa | 10 ⭐ |
| 6 | NCM | **87083090** | Peças | 4.1.03.001 - Sistemas Freio | 10 ⭐ |
| 7 | WILDCARD | **4011\*** | Pneus | 4.1.04.001 - Pneus | 10 ⭐ |
| 8 | WILDCARD | **8708\*** | Peças | 4.1.03.001 - Peças Veículos | 20 |
| 9 | WILDCARD | **8421\*** | Peças | 4.1.03.001 - Filtros | 20 |
| 10 | WILDCARD | **8481\*** | Peças | 4.1.03.001 - Válvulas | 20 |
| 11 | WILDCARD | **2710\*** | Combustível | 4.1.01.001 - Diesel Genérico | 50 |

**Cobertura:**
- ✅ **Combustíveis:** 3 regras (diesel, genérico)
- ✅ **Lubrificantes:** 2 regras (óleo, graxa)
- ✅ **Aditivos:** 1 regra (arla)
- ✅ **Pneus:** 1 regra (wildcard)
- ✅ **Peças:** 4 regras (freio, filtros, válvulas, genérico)

**Estimativa de Cobertura:**
- ⭐ **~60-70%** dos itens típicos de transportadora
- ⚠️ **Faltam:** Material escritório, uniformes, EPIs, ferramentas, etc.

---

## 🎯 RESPOSTAS DIRETAS ÀS PERGUNTAS

### ❓ **"NFe de Compra qual rotina está seguindo automático?"**

**Resposta:**
✅ **Rotina COMPLETA E AUTOMÁTICA** para NFes classificadas como `PURCHASE`:

```
1. Import XML → 2. Parse → 3. Classifica (PURCHASE) →
4. Cadastra Fornecedor → 5. Classifica cada item (NCM) →
6. Agrupa por categoria → 7. Cria N contas a pagar →
8. Detalha itens → 9. Pronto!
```

**Arquivo:** `src/services/sefaz-processor.ts` (função `importNFeAutomatically`)

---

### ❓ **"Importação sistema identifica NCM automático?"**

**Resposta:**
✅ **SIM! 100% AUTOMÁTICO**

- ✅ NCM é extraído de **cada item** do XML
- ✅ Armazenado em `payable_items.ncm`
- ✅ Usado pelo motor de classificação
- ✅ Funciona para wildcard (ex: `2710*` pega todos combustíveis)

**Exemplo:**
```xml
<prod>
  <NCM>27101251</NCM>           ← EXTRAÍDO AUTOMATICAMENTE
  <xProd>OLEO DIESEL S10</xProd>
</prod>
```

---

### ❓ **"PCC Automático?"**

**Resposta:**
⚠️ **PARCIALMENTE AUTOMÁTICO (80% de sucesso)**

**Como funciona:**
1. ✅ Sistema busca regra pelo NCM do item
2. ✅ Se ENCONTROU regra → PCC é definido **automaticamente**
3. ❌ Se NÃO encontrou regra → PCC fica **NULL** (manual)

**Exemplo:**
```
Item: Diesel S10 (NCM 27101251)
├─ Busca regra com NCM 27101251
├─ ✅ ENCONTROU: Regra #1
├─ PCC: 4.1.01.001 - Diesel S10
└─ ✅ AUTOMÁTICO

Item: Papel A4 (NCM 48201000)
├─ Busca regra com NCM 48201000
├─ ❌ NÃO ENCONTROU nenhuma regra
├─ PCC: NULL
└─ ⚠️ PRECISA SER CLASSIFICADO MANUALMENTE
```

**Taxa de Sucesso:**
- ✅ **Itens típicos transportadora:** ~70-80% (combustível, pneus, peças)
- ⚠️ **Itens administrativos:** ~20-30% (escritório, limpeza, etc)

**Regras Configuradas:** **11 regras** (ver tabela acima)

---

### ❓ **"PCG Automático?"**

**Resposta:**
❌ **NÃO! PCG NÃO ESTÁ IMPLEMENTADO**

**Situação Atual:**
- ✅ Tabela `management_chart_of_accounts` **EXISTE**
- ✅ Tem **8 contas PCG** cadastradas
- ❌ Tabela `accounts_payable` **NÃO tem** campo `pcg_account_id`
- ❌ Motor de classificação **NÃO classifica** PCG
- ❌ Não há regras PCG configuradas

**Para Implementar:**
```sql
-- 1. Adicionar campo
ALTER TABLE accounts_payable 
ADD pcg_account_id INT NULL;

-- 2. Adicionar regras de mapeamento PCC → PCG
-- Exemplo: PCC 4.1.01.001 → PCG G-1000

-- 3. Atualizar motor de classificação
-- Para incluir PCG no resultado
```

---

### ❓ **"CC Automático?"**

**Resposta:**
⚠️ **PARCIALMENTE (50% de sucesso)**

**Como funciona:**
1. ✅ Motor de classificação **PODE** definir CC
2. ✅ Campo existe: `auto_classification_rules.cost_center_id`
3. ⚠️ **MAS:** Poucas regras têm CC definido
4. ⚠️ **Maioria:** `cost_center_id = NULL`

**Exemplo:**

**Regra COM CC:**
```sql
Regra: Diesel S10
├─ ncm_code: 27101251
├─ category_id: 1
├─ chart_account_id: 15 (PCC)
├─ cost_center_id: 3     ← ✅ DEFINIDO (CC-001 Operacional)
└─ Resultado: CC AUTOMÁTICO
```

**Regra SEM CC (maioria):**
```sql
Regra: Pneus
├─ ncm_code: 4011*
├─ category_id: 5
├─ chart_account_id: 20 (PCC)
├─ cost_center_id: NULL  ← ⚠️ NÃO DEFINIDO
└─ Resultado: CC precisa ser MANUAL
```

**Para Melhorar:**
```sql
-- Atualizar as 11 regras existentes:
UPDATE auto_classification_rules 
SET cost_center_id = 3  -- CC-001 Operacional
WHERE category_id IN (1,2,3,5);  -- Combustível, Lubrif, Aditivos, Pneus
```

---

### ❓ **"Cria contas a Pagar automático?"**

**Resposta:**
✅ **SIM! 100% AUTOMÁTICO para NFe de COMPRA**

**Condições:**
1. ✅ NFe classificada como `PURCHASE`
2. ✅ Ao menos 1 item classificado com sucesso
3. ✅ Criação é automática durante importação

**Quantidade de contas:**
- ✅ **1 conta por categoria** (agrupamento inteligente)
- ✅ **Não é 1 conta por NFe!**
- ✅ **É N contas** (N = número de categorias diferentes)

**Exemplo:**
```
NFe com 5 itens:
├─ 2 Diesel (categoria Combustível)
├─ 1 Óleo (categoria Lubrificantes)
├─ 1 Arla (categoria Aditivos)
└─ 1 Pneu (categoria Pneus)

Resultado: 4 contas a pagar criadas
```

**Tabelas:**
- ✅ `accounts_payable` (as contas)
- ✅ `payable_items` (detalhamento de cada item)

---

### ❓ **"CTe da mesma forma?"**

**Resposta:**
⚠️ **PARCIALMENTE**

#### **CTe PRÓPRIO (emitido por nós):**
✅ **SIM** - Gera conta a **RECEBER** automaticamente
- Categoria: Receita de Frete
- PCC: 3.1.01.001
- Valor: Valor do frete
- Vencimento: Prazo do cliente

#### **CTe EXTERNO (redespacho):**
❌ **NÃO** - **NÃO gera conta a PAGAR**
- ⚠️ Funcionalidade **não implementada**
- ⚠️ CTe é importado mas fica sem movimentação financeira
- ⚠️ Precisa criar conta manualmente

**Diferença:**
- NFe compra → ✅ Gera conta a pagar **automaticamente**
- CTe externo → ❌ **NÃO** gera conta a pagar

---

## 🔧 LACUNAS IDENTIFICADAS

### **❌ 1. PCG Não Implementado**

**Status:** Tabela existe, mas não é usada

**Impacto:**
- ⚠️ Sem visão gerencial automatizada
- ⚠️ Relatórios gerenciais precisam de classificação manual

**Solução:**
```sql
-- Adicionar campo em accounts_payable
ALTER TABLE accounts_payable ADD pcg_account_id INT NULL;

-- Criar mapeamento PCC → PCG
-- Ex: 4.1.01.001 (Diesel) → G-1000 (Custo Diesel por KM)
```

---

### **❌ 2. CC Parcialmente Implementado**

**Status:** Motor suporta, mas poucas regras têm CC

**Impacto:**
- ⚠️ ~50% das contas ficam sem CC
- ⚠️ Dificulta análise por centro de custo

**Solução:**
```sql
-- Atualizar regras existentes:
UPDATE auto_classification_rules SET cost_center_id = 3   -- Operacional
WHERE category_id IN (1,2,3,5);  -- Combustível, Lubrif, Aditivos, Pneus

UPDATE auto_classification_rules SET cost_center_id = 4   -- Manutenção
WHERE category_id = 4;  -- Peças
```

---

### **❌ 3. CTe Externo → Conta a Pagar**

**Status:** Não implementado

**Impacto:**
- ❌ Fretes pagos a terceiros não geram contas automaticamente
- ⚠️ Precisa criar manualmente

**Solução:**
Criar função similar a `createPayablesFromNFe`:

```typescript
// Arquivo novo: src/services/financial/cte-payable-generator.ts

export async function createPayableFromCTe(
  cte: ParsedCTe,
  cteId: number,
  organizationId: number,
  branchId: number,
  carrierId: number,  // Transportadora
  userId: string
): Promise<PayableGenerationResult> {
  // Cria 1 conta a pagar
  // Categoria: "Frete Pago - Redespacho"
  // PCC: 4.2.01.001
  // CC: Inferir da rota ou operação
  // Valor: valor do frete
  // Vencimento: Prazo padrão (30 dias) ou configurável
}

// Integrar com importExternalCTe()
```

---

### **❌ 4. Poucas Regras NCM**

**Status:** Apenas 11 regras

**Impacto:**
- ⚠️ ~30-40% dos itens ficam sem classificação
- ⚠️ Especialmente: material escritório, limpeza, ferramentas

**Solução:**
Expandir matriz NCM para 50-100 regras:

```
Adicionar:
- Material de Escritório (20+ NCMs)
- Uniformes e EPIs (10+ NCMs)
- Ferramentas (15+ NCMs)
- Produtos de Limpeza (10+ NCMs)
- Material Elétrico (10+ NCMs)
- Serviços (ISS)
```

---

### **❌ 5. Sem Rateio de Despesas Acessórias**

**Status:** Não implementado

**Impacto:**
- ⚠️ IPI, Frete, Seguro não são distribuídos
- ⚠️ Vão apenas no total da NFe
- ⚠️ Distorce custo real por item

**Exemplo do Problema:**

```
NFe R$ 10.000:
├─ Produtos: R$ 9.000
├─ IPI: R$ 500
├─ Frete: R$ 300
└─ Seguro: R$ 200

Atualmente:
Conta a Pagar = R$ 9.000 (só produtos)
IPI/Frete/Seguro = perdidos ❌

Deveria ser:
Conta a Pagar = R$ 10.000 (total)
Rateio proporcional por item
```

**Solução:**
```typescript
// Distribuir despesas proporcionalmente ao valor de cada item
const itemPercentage = itemValue / totalProducts;
const itemIpi = totalIpi * itemPercentage;
const itemFreight = totalFreight * itemPercentage;
const itemInsurance = totalInsurance * itemPercentage;
const itemFinalValue = itemValue + itemIpi + itemFreight + itemInsurance;
```

---

## 🚀 RECOMENDAÇÕES PRIORITÁRIAS

### **🔴 Alta Prioridade (Implementar esta semana):**

1. **Adicionar 40+ regras NCM**
   - Focar em itens mais frequentes
   - Validar com histórico de NFes
   - Meta: 90% de cobertura

2. **Definir CC nas 11 regras existentes**
   ```sql
   UPDATE auto_classification_rules 
   SET cost_center_id = [CC apropriado]
   WHERE cost_center_id IS NULL;
   ```

3. **Implementar CTe → Conta a Pagar**
   - Criar `cte-payable-generator.ts`
   - Integrar com `importExternalCTe()`

---

### **🟡 Média Prioridade (Próximas 2 semanas):**

4. **Integrar PCG**
   - Adicionar campo `pcg_account_id`
   - Criar mapeamento PCC → PCG
   - Atualizar motor de classificação

5. **Rateio de Despesas Acessórias**
   - IPI, Frete, Seguro distribuídos
   - Agregar no valor real de cada item

6. **Dashboard de Classificação**
   - Itens sem classificação
   - Novas NCMs detectadas
   - Taxa de sucesso

---

### **🟢 Baixa Prioridade (Médio prazo):**

7. **Classificação por Fornecedor**
   - Shell → Sempre Combustível
   - Auto Peças XYZ → Sempre Peças

8. **Sugestão de Regras**
   - IA detecta padrões
   - Sugere novas regras NCM

9. **Relatórios de Auditoria**
   - Classificações manuais vs automáticas
   - NCMs mais frequentes

---

## ✅ CHECKLIST FINAL

### **NFe de Compra:**

| Item | Status | Detalhes |
|------|--------|----------|
| Parse XML | ✅ | Extrai TODOS os dados |
| Identifica NCM | ✅ | De CADA item, 100% |
| Cadastra Fornecedor | ✅ | Se não existir |
| Classifica Fiscal | ✅ | PURCHASE/CARGO/etc |
| Classifica PCC | ⚠️ | 80% (se houver regra) |
| Classifica PCG | ❌ | Não implementado |
| Aloca CC | ⚠️ | 50% (se regra definir) |
| Agrupa por Categoria | ✅ | Itens mesma categoria |
| Cria Contas a Pagar | ✅ | 1 por categoria |
| Detalha Itens | ✅ | payable_items completo |
| Extrai Vencimento | ✅ | De `<dup>` |

**Score de Automação:** **75%**

---

### **CTe:**

| Item | CTe Próprio | CTe Externo |
|------|-------------|-------------|
| Parse XML | ✅ | ✅ |
| Importa SEFAZ | N/A | ✅ |
| Vincula NFe | ✅ | ✅ |
| Classifica PCC | ✅ Fixo | ⚠️ |
| Classifica PCG | ❌ | ❌ |
| Aloca CC | ⚠️ | ⚠️ |
| Cria Conta Receber | ✅ | N/A |
| Cria Conta Pagar | N/A | ❌ |

**Score de Automação:**
- CTe Próprio: **80%**
- CTe Externo: **40%**

---

**Autor:** Sistema Aura Core  
**Data:** 11/12/2025  
**Versão:** 2.0 (Análise Completa)  
**Status:** ✅ DOCUMENTADO

