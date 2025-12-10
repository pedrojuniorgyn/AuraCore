# 🔍 ANÁLISE COMPLETA DO SISTEMA - REPOSITÓRIO DE CARGAS

**Data:** 08/12/2025  
**Autor:** Análise Técnica Pré-Implementação  
**Objetivo:** Classificação automática de NFes e criação de Repositório de Cargas

---

## 📊 **PARTE 1: MAPEAMENTO DO FLUXO ATUAL**

### **1.1 IMPORTAÇÃO DE NFE (Como está hoje)**

```
┌─────────────────────────────────────────────────────────────┐
│  SEFAZ DistribuicaoDFe                                      │
│  ↓                                                           │
│  sefaz-processor.ts                                         │
│  ├─ Descompacta XML (GZIP)                                  │
│  ├─ Identifica tipo (resNFe, procNFe, resEvento)           │
│  └─ Se procNFe → importNFeAutomatically()                   │
│     ↓                                                        │
│     ├─ Lê emitente (parsedNFe.issuer)                       │
│     ├─ Auto-cadastra fornecedor se não existir             │
│     └─ Salva em: inbound_invoices                          │
│                                                              │
│  ⚠️  PROBLEMA: Não diferencia TIPOS de NFe                  │
│     - NFe de Compra (somos destinatário)                    │
│     - NFe de Carga (somos transportador) ← UNILEVER!        │
└─────────────────────────────────────────────────────────────┘
```

**Campos salvos atualmente em `inbound_invoices`:**
- ✅ `access_key`, `number`, `series`, `model`
- ✅ `issue_date`, `total_products`, `total_nfe`
- ✅ `partner_id` (emitente)
- ✅ `xml_content` (completo)
- ✅ `status` (IMPORTED)
- ❌ **FALTA:** `nfe_type` (classificação)

---

### **1.2 FLUXO COMERCIAL → TMS → FISCAL → FINANCEIRO (Como está)**

```
┌─────────────────────────────────────────────────────────────┐
│  FASE 1: COMERCIAL                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │ freight_quotes (Cotações)                          │    │
│  │ - Cliente liga: "Tenho 15 pallets pra Bahia"      │    │
│  │ - Sistema calcula frete (freight-calculator.ts)   │    │
│  │ - Status: NEW → QUOTED → ACCEPTED                 │    │
│  └────────────────────────────────────────────────────┘    │
│                        ↓                                     │
│                  workflow-automator.ts                      │
│                  createPickupOrderFromQuote()               │
│                        ↓                                     │
├─────────────────────────────────────────────────────────────┤
│  FASE 2: TMS (Ordem de Coleta)                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │ pickup_orders                                      │    │
│  │ - Criada da cotação                               │    │
│  │ - Status: PENDING_ALLOCATION                      │    │
│  │ - ⚠️  VAZIO: Não tem link com NFe do cliente!     │    │
│  └────────────────────────────────────────────────────┘    │
│                        ↓                                     │
│                  Operador aloca Veículo + Motorista        │
│                        ↓                                     │
├─────────────────────────────────────────────────────────────┤
│  FASE 3: FISCAL SAÍDA (CTe)                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ cte_header                                         │    │
│  │ - Gerado da ordem de coleta                       │    │
│  │ - ⚠️  BUG: Sem NFe do cliente vinculada!          │    │
│  │                                                    │    │
│  │ cte_cargo_documents (Notas no CTe)                │    │
│  │ - Deveria ter as NFes de carga                    │    │
│  │ - ⚠️  ESTÁ VAZIO! Manual hoje!                     │    │
│  └────────────────────────────────────────────────────┘    │
│                        ↓                                     │
│                  XML + Assinatura + Sefaz                   │
│                  Status: AUTHORIZED                         │
│                        ↓                                     │
├─────────────────────────────────────────────────────────────┤
│  FASE 4: FINANCEIRO (Contas a Receber)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │ accounts_receivable                                │    │
│  │ - Criada automaticamente quando CTe autorizado    │    │
│  │ - workflow-automator: createReceivableFromCte()   │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 **PARTE 2: GAPS CRÍTICOS IDENTIFICADOS**

### **GAP #1: NFe de Carga NÃO está entrando no fluxo TMS**

**Cenário Real (Unilever):**

```xml
<NFe>
  <emit>
    <CNPJ>01.227.943/0001-05</CNPJ>
    <xNome>Unilever Brasil Ltda</xNome>
  </emit>
  
  <dest>
    <CNPJ>12.345.678/0001-99</CNPJ> <!-- Supermercado Final -->
    <xNome>Rede SuperBom</xNome>
  </dest>
  
  <transp>
    <transporta>
      <CNPJ>SEU_CNPJ_TCL</CNPJ> <!-- VOCÊ! -->
      <xNome>TCL Transporte Rodoviario</xNome>
    </transporta>
  </transp>
</NFe>
```

**O que acontece hoje:**
1. ✅ NFe é importada automaticamente
2. ✅ Unilever é cadastrada como `business_partner`
3. ❌ NFe fica "perdida" em `inbound_invoices`
4. ❌ Operador TMS NÃO vê essa carga
5. ❌ CTe é gerado SEM a NFe vinculada
6. ❌ Risco de multa (CTe sem nota = INVÁLIDO)

**Impacto:** 🔴 **CRÍTICO - Sistema NÃO está operacional para logística!**

---

### **GAP #2: Classificação Manual vs Automática**

**Tipos de NFe que TCL recebe:**

| Tipo | Papel da TCL | Tag XML Identificadora | Finalidade | Ação Correta |
|------|-------------|------------------------|------------|--------------|
| **COMPRA** | Destinatário | `<dest>` = TCL | Gerar Custo | → Contas a Pagar |
| **CARGA** | Transportador | `<transp>` = TCL | Gerar Receita | → Repositório → CTe |
| **DEVOLUÇÃO** | Remetente | `<emit>` = TCL | Crédito | → Análise Manual |

**Problema:**
- Hoje: **TODAS** vão para `inbound_invoices` sem distinção
- Operador TMS não sabe quais são "cargas para transportar"
- Financeiro não sabe quais geram custo vs receita

---

### **GAP #3: Workflow Quebrado (Cotação → CTe)**

**Fluxo esperado:**
```
Cliente envia NFe (Unilever) → Importa automaticamente
                            ↓
                    Repositório de Cargas
                            ↓
                    Operador cria Viagem
                            ↓
                    Seleciona Cargas do Repositório
                            ↓
                    Gera CTe (com NFes vinculadas)
```

**Fluxo atual (QUEBRADO):**
```
Cliente envia NFe (Unilever) → Importa automaticamente
                            ↓
                    inbound_invoices (fica parada)
                            ❌
                    Operador cria Viagem (sem NFe)
                            ↓
                    Gera CTe (SEM notas = INVÁLIDO)
```

---

## 🔗 **PARTE 3: ANÁLISE DE IMPACTOS E DEPENDÊNCIAS**

### **3.1 TABELAS AFETADAS**

| Tabela | Mudança | Impacto | Risco |
|--------|---------|---------|-------|
| `inbound_invoices` | ✅ ADD `nfe_type` | Classificação automática | 🟢 Baixo (novo campo nullable) |
| `pickup_orders` | ✅ ADD `nfe_keys` (JSON array) | Link com NFes de carga | 🟢 Baixo (novo campo nullable) |
| `cte_cargo_documents` | ✅ ADD `source_invoice_id` | Rastreabilidade NFe → CTe | 🟢 Baixo (FK nullable) |
| `cargo_documents` | ✅ **NOVA TABELA** | Repositório intermediário | 🟡 Médio (nova estrutura) |

### **3.2 SERVIÇOS AFETADOS**

| Serviço | Mudança | Complexidade |
|---------|---------|--------------|
| `sefaz-processor.ts` | ✅ Adicionar classificação automática | 🟢 Baixa (1 função) |
| `workflow-automator.ts` | ✅ Vincular NFes ao criar CTe | 🟡 Média (ajuste lógica) |
| `cte-builder.ts` | ✅ Incluir NFes em `<infDoc>` do XML | 🟡 Média (XML complexo) |

### **3.3 FRONTEND AFETADO**

| Página | Mudança | Esforço |
|--------|---------|---------|
| `/fiscal/entrada-notas` | ✅ Adicionar filtro "Compras" vs "Cargas" | 🟢 1h |
| `/tms/repositorio-cargas` | ✅ **NOVA PÁGINA** (Repositório) | 🟡 6h |
| `/tms/viagens/create` | ✅ Adicionar step "Selecionar Cargas" | 🟡 4h |
| `/fiscal/cte` | ✅ Mostrar NFes vinculadas ao CTe | 🟢 2h |

---

## 🛠️ **PARTE 4: PLANEJAMENTO DE IMPLEMENTAÇÃO**

### **ARQUITETURA PROPOSTA: Híbrida (Simples + Robusto)**

#### **DECISÃO TÉCNICA:**
1. ✅ **Campo `nfe_type`** em `inbound_invoices` (classificação rápida)
2. ✅ **Tabela `cargo_documents`** (repositório estruturado)
3. ✅ **Link bidirecional:** NFe ↔ Cargo ↔ Trip ↔ CTe

**Vantagem:**
- Mantém histórico completo (auditoria)
- Permite workflow visual (Kanban de cargas)
- Não quebra nada existente

---

### **SCHEMA COMPLETO (Mudanças + Novas Tabelas)**

#### **4.1 Atualizar `inbound_invoices`**

```typescript
// Adicionar campos:
export const inboundInvoices = mssqlTable("inbound_invoices", {
  // ... campos existentes ...
  
  // ✅ NOVO: Classificação Automática
  nfeType: nvarchar("nfe_type", { length: 20 }).default("PURCHASE"),
  // Valores: 'PURCHASE' (compra), 'CARGO' (carga), 'RETURN' (devolução), 'OTHER'
  
  // ✅ NOVO: Dados do Transportador (se for carga)
  carrierCnpj: nvarchar("carrier_cnpj", { length: 14 }),
  carrierName: nvarchar("carrier_name", { length: 255 }),
  
  // ✅ NOVO: Destinatário (para saber rota)
  recipientCnpj: nvarchar("recipient_cnpj", { length: 14 }),
  recipientName: nvarchar("recipient_name", { length: 255 }),
  recipientCity: nvarchar("recipient_city", { length: 100 }),
  recipientUf: nvarchar("recipient_uf", { length: 2 }),
  
  // ... resto igual ...
});
```

**Migration SQL:**

```sql
-- 0014_cargo_classification.sql

ALTER TABLE inbound_invoices 
ADD nfe_type NVARCHAR(20) DEFAULT 'PURCHASE';

ALTER TABLE inbound_invoices 
ADD carrier_cnpj NVARCHAR(14) NULL;

ALTER TABLE inbound_invoices 
ADD carrier_name NVARCHAR(255) NULL;

ALTER TABLE inbound_invoices 
ADD recipient_cnpj NVARCHAR(14) NULL;

ALTER TABLE inbound_invoices 
ADD recipient_name NVARCHAR(255) NULL;

ALTER TABLE inbound_invoices 
ADD recipient_city NVARCHAR(100) NULL;

ALTER TABLE inbound_invoices 
ADD recipient_uf NVARCHAR(2) NULL;
```

---

#### **4.2 Criar `cargo_documents` (Repositório)**

```typescript
export const cargoDocuments = mssqlTable("cargo_documents", {
  id: int("id").primaryKey().identity(),
  organizationId: int("organization_id").notNull(),
  branchId: int("branch_id").notNull(),
  
  // ✅ Vínculo com NFe Original
  nfeInvoiceId: int("nfe_invoice_id").references(() => inboundInvoices.id),
  
  // ✅ Dados Resumidos da Carga (cache para performance)
  accessKey: nvarchar("access_key", { length: 44 }).notNull(),
  nfeNumber: nvarchar("nfe_number", { length: 20 }),
  issuerName: nvarchar("issuer_name", { length: 255 }).notNull(),
  recipientName: nvarchar("recipient_name", { length: 255 }).notNull(),
  
  // ✅ Rota (para agrupar por região)
  originUf: nvarchar("origin_uf", { length: 2 }),
  originCity: nvarchar("origin_city", { length: 100 }),
  destinationUf: nvarchar("destination_uf", { length: 2 }),
  destinationCity: nvarchar("destination_city", { length: 100 }),
  
  // ✅ Valores
  cargoValue: decimal("cargo_value", { precision: 18, scale: 2 }),
  weight: decimal("weight", { precision: 10, scale: 3 }),
  volume: decimal("volume", { precision: 10, scale: 3 }),
  
  // ✅ Status no Workflow
  status: nvarchar("status", { length: 20 }).notNull().default("PENDING"),
  // 'PENDING'           → Aguardando alocação
  // 'ASSIGNED_TO_TRIP'  → Vinculada a viagem
  // 'IN_TRANSIT'        → Em trânsito
  // 'DELIVERED'         → Entregue
  // 'CANCELED'          → Cancelada
  
  // ✅ Prazo
  issueDate: datetime2("issue_date").notNull(),
  deliveryDeadline: datetime2("delivery_deadline"),
  
  // ✅ Vínculos TMS/Fiscal
  tripId: int("trip_id").references(() => trips.id),
  cteId: int("cte_id").references(() => cteHeader.id),
  
  // ✅ Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).notNull(),
  updatedBy: nvarchar("updated_by", { length: 255 }),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
});
```

**Migration SQL:**

```sql
CREATE TABLE cargo_documents (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  nfe_invoice_id INT NULL,
  access_key NVARCHAR(44) NOT NULL,
  nfe_number NVARCHAR(20),
  issuer_name NVARCHAR(255) NOT NULL,
  recipient_name NVARCHAR(255) NOT NULL,
  origin_uf NVARCHAR(2),
  origin_city NVARCHAR(100),
  destination_uf NVARCHAR(2),
  destination_city NVARCHAR(100),
  cargo_value DECIMAL(18,2),
  weight DECIMAL(10,3),
  volume DECIMAL(10,3),
  status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
  issue_date DATETIME2 NOT NULL,
  delivery_deadline DATETIME2,
  trip_id INT NULL,
  cte_id INT NULL,
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_cargo_docs_nfe FOREIGN KEY (nfe_invoice_id) 
    REFERENCES inbound_invoices(id),
  CONSTRAINT FK_cargo_docs_trip FOREIGN KEY (trip_id) 
    REFERENCES trips(id),
  CONSTRAINT FK_cargo_docs_cte FOREIGN KEY (cte_id) 
    REFERENCES cte_header(id)
);

CREATE INDEX idx_cargo_docs_status ON cargo_documents(status);
CREATE INDEX idx_cargo_docs_destination ON cargo_documents(destination_uf, destination_city);
CREATE INDEX idx_cargo_docs_deadline ON cargo_documents(delivery_deadline);
```

---

#### **4.3 Atualizar `cte_cargo_documents`**

```typescript
export const cteCargoDocuments = mssqlTable("cte_cargo_documents", {
  // ... campos existentes ...
  
  // ✅ NOVO: Rastreabilidade
  sourceInvoiceId: int("source_invoice_id").references(() => inboundInvoices.id),
  sourceCargoId: int("source_cargo_id").references(() => cargoDocuments.id),
  
  // ... resto igual ...
});
```

---

## 📋 **PARTE 5: ORDEM DE EXECUÇÃO DETALHADA**

### **BLOCO 1: FUNDAÇÃO (Classificação Automática)** ⏱️ 3-4h

#### **1.1 Schema & Migration**
```
✅ Atualizar schema.ts
   ├─ inbound_invoices: +nfe_type, +carrier_*, +recipient_*
   ├─ cargo_documents: tabela completa
   └─ cte_cargo_documents: +source_invoice_id, +source_cargo_id

✅ Criar migration: 0014_cargo_classification.sql

✅ Executar migration via API admin
```

#### **1.2 Serviço Classificador**
```
✅ Criar: src/services/fiscal/nfe-classifier.ts

Funções:
  - classifyNFe(xml, branchCnpj): NFeType
    └─ Lê tags <emit>, <dest>, <transp>
    └─ Compara CNPJs
    └─ Retorna: PURCHASE | CARGO | RETURN | OTHER
  
  - extractCargoInfo(xml): CargoMetadata
    └─ Extrai destinatário, rota, peso, valor
```

#### **1.3 Integrar no Processador**
```
✅ Atualizar: src/services/sefaz-processor.ts

Na função importNFeAutomatically():
  1. Classificar NFe (classifyNFe)
  2. Salvar nfe_type em inbound_invoices
  3. Se CARGO → criar registro em cargo_documents
```

**Código Exemplo:**

```typescript
// Em sefaz-processor.ts

import { classifyNFe, extractCargoInfo } from "./fiscal/nfe-classifier";

async function importNFeAutomatically(...) {
  const parsedNFe = await parseNFeXML(xmlContent);
  
  // ✅ CLASSIFICAR
  const nfeType = classifyNFe(parsedNFe.xml, branch.document);
  const cargoInfo = nfeType === 'CARGO' ? extractCargoInfo(parsedNFe.xml) : null;
  
  // Salvar NFe
  const [invoice] = await db.insert(inboundInvoices).values({
    ...existingFields,
    nfeType, // ← NOVO!
    carrierCnpj: cargoInfo?.carrier.cnpj,
    carrierName: cargoInfo?.carrier.name,
    recipientCnpj: cargoInfo?.recipient.cnpj,
    recipientName: cargoInfo?.recipient.name,
    recipientCity: cargoInfo?.destination.city,
    recipientUf: cargoInfo?.destination.uf,
  }).returning();
  
  // ✅ SE FOR CARGA → CRIAR NO REPOSITÓRIO
  if (nfeType === 'CARGO' && cargoInfo) {
    await db.insert(cargoDocuments).values({
      organizationId,
      branchId,
      nfeInvoiceId: invoice.id,
      accessKey: parsedNFe.accessKey,
      nfeNumber: parsedNFe.number,
      issuerName: cargoInfo.issuer.name,
      recipientName: cargoInfo.recipient.name,
      originUf: cargoInfo.origin.uf,
      originCity: cargoInfo.origin.city,
      destinationUf: cargoInfo.destination.uf,
      destinationCity: cargoInfo.destination.city,
      cargoValue: cargoInfo.value,
      weight: cargoInfo.weight,
      volume: cargoInfo.volume,
      issueDate: parsedNFe.issueDate,
      status: 'PENDING',
      createdBy: userId,
    });
  }
}
```

#### **1.4 UI: Filtro na Entrada de Notas**
```
✅ Atualizar: src/app/(dashboard)/fiscal/entrada-notas/page.tsx

Adicionar Tabs:
  - [Todas] (sem filtro)
  - [💳 Compras] (nfe_type = PURCHASE)
  - [📦 Cargas] (nfe_type = CARGO) ← NOVO!
  - [↩️ Devoluções] (nfe_type = RETURN)

Badge no Grid:
  - PURCHASE → Badge vermelho "Compra"
  - CARGO → Badge verde "Carga p/ Transporte"
```

---

### **BLOCO 2: REPOSITÓRIO DE CARGAS (Interface Operacional)** ⏱️ 6-8h

#### **2.1 API Backend**
```
✅ Criar: src/app/api/tms/cargo-repository/route.ts

Endpoints:
  GET  /api/tms/cargo-repository
    └─ Lista cargas PENDING
    └─ Filtros: origem, destino, prazo, cliente
  
  PUT  /api/tms/cargo-repository/[id]/assign
    └─ Vincula carga a viagem
    └─ Status: PENDING → ASSIGNED_TO_TRIP
  
  PUT  /api/tms/cargo-repository/[id]/cancel
    └─ Cancela carga
```

#### **2.2 Frontend: Página do Repositório**
```
✅ Criar: src/app/(dashboard)/tms/repositorio-cargas/page.tsx

Features:
  - KPI Cards:
    └─ Total Pendente
    └─ Prazo Vencendo (< 48h)
    └─ Valor Total (R$)
  
  - AG Grid:
    └─ Colunas: NFe, Cliente, Rota, Peso, Valor, Prazo
    └─ Badge Status (colorido)
    └─ Prioridade (vermelho se prazo < 24h)
    └─ Ação: "Alocar em Viagem"
  
  - Filtros Rápidos:
    └─ Por UF Destino
    └─ Por Cliente
    └─ Prazo Urgente
```

---

### **BLOCO 3: INTEGRAÇÃO TMS → CTe (Automação)** ⏱️ 4-6h

#### **3.1 Atualizar Criação de Viagem**
```
✅ Atualizar: src/app/(dashboard)/tms/viagens/create (Modal)

Adicionar Step 2: "Selecionar Cargas"
  - Lista cargas PENDING filtradas por rota
  - Multi-select
  - Ao selecionar:
    └─ Salvar IDs em trips.cargo_document_ids (JSON array)
    └─ Atualizar cargo_documents.status → ASSIGNED_TO_TRIP
    └─ Atualizar cargo_documents.trip_id
```

#### **3.2 Vincular CTe às NFes**
```
✅ Atualizar: src/services/fiscal/cte-builder.ts

Na função buildCteXml():
  1. Buscar cargo_documents da viagem
  2. Para cada carga:
     └─ Adicionar <infDoc> no XML
     └─ Incluir chave NFe, valor, peso
  3. Salvar em cte_cargo_documents
```

**Código Exemplo (CTe Builder):**

```typescript
// Buscar cargas da viagem
const cargoList = await db
  .select()
  .from(cargoDocuments)
  .where(eq(cargoDocuments.tripId, trip.id));

// Montar XML
const infDoc = cargoList.map(cargo => ({
  chNFe: cargo.accessKey,
  vNF: cargo.cargoValue,
  pesoM: cargo.weight,
}));

// Salvar vínculos
for (const cargo of cargoList) {
  await db.insert(cteCargoDocuments).values({
    cteHeaderId: cte.id,
    documentType: 'NFE',
    documentKey: cargo.accessKey,
    documentValue: cargo.cargoValue,
    sourceInvoiceId: cargo.nfeInvoiceId,
    sourceCargoId: cargo.id,
  });
}
```

---

## 🎯 **PARTE 6: VALIDAÇÕES E REGRAS DE NEGÓCIO**

### **6.1 Validações de Segurança**

```typescript
// Não permitir alocar carga de outra filial
if (cargo.branchId !== trip.branchId) {
  throw new Error("Carga pertence a outra filial");
}

// Não permitir alocar carga já alocada
if (cargo.status !== 'PENDING') {
  throw new Error("Carga já foi alocada");
}

// Alertar se prazo está próximo
const hoursUntilDeadline = differenceInHours(cargo.deliveryDeadline, new Date());
if (hoursUntilDeadline < 24) {
  console.warn("⚠️  Carga com prazo urgente!");
}
```

### **6.2 Auditoria e Rastreabilidade**

```
Toda ação deve ser auditada:
  - Classificação automática → audit_logs
  - Alocação de carga → audit_logs
  - Mudança de status → audit_logs
  - Geração de CTe → audit_logs
```

---

## 📊 **PARTE 7: TESTES E VALIDAÇÃO**

### **Casos de Teste:**

1. ✅ **NFe de Compra (Diesel)**
   - `<dest>` = TCL
   - Deve classificar como PURCHASE
   - NÃO deve ir para repositório

2. ✅ **NFe de Carga (Unilever)**
   - `<transp>` = TCL
   - Deve classificar como CARGO
   - Deve criar em cargo_documents
   - Status: PENDING

3. ✅ **Alocar Carga em Viagem**
   - Criar viagem
   - Selecionar carga do repositório
   - Status: ASSIGNED_TO_TRIP
   - trip_id preenchido

4. ✅ **Gerar CTe com NFe vinculada**
   - CTe deve ter <infDoc> preenchido
   - cte_cargo_documents deve ter registro
   - XML válido (validador Sefaz)

---

## 🚀 **PARTE 8: CRONOGRAMA DE EXECUÇÃO**

### **SPRINT 1: Classificação (3-4h)**
```
[✓] Atualizar schema.ts
[✓] Criar migration
[✓] Executar migration
[✓] Criar nfe-classifier.ts
[✓] Atualizar sefaz-processor.ts
[✓] Adicionar filtro em entrada-notas/page.tsx
[✓] Testar com NFe Unilever
```

### **SPRINT 2: Repositório (6-8h)**
```
[✓] Criar API cargo-repository
[✓] Criar página repositorio-cargas
[✓] AG Grid + Filtros
[✓] KPIs
[✓] Ação "Alocar em Viagem"
```

### **SPRINT 3: Integração TMS (4-6h)**
```
[✓] Atualizar modal criar viagem
[✓] Step "Selecionar Cargas"
[✓] Atualizar cte-builder.ts
[✓] Vincular NFes ao CTe
[✓] Testar fluxo completo
```

---

## ✅ **PARTE 9: CHECKLIST FINAL**

### **Antes de Aprovar:**

- [ ] Schema completo revisado
- [ ] Nenhuma FK quebrada
- [ ] Migração SQL validada
- [ ] Rollback plan (se der erro)
- [ ] Testes de cada bloco
- [ ] Dados de produção não afetados

### **Aprovação:**

**Você aprova este planejamento?**

Se SIM, vou executar na seguinte ordem:
1. BLOCO 1 (3-4h)
2. BLOCO 2 (6-8h)
3. BLOCO 3 (4-6h)

**Total estimado: 13-18h de desenvolvimento**

---

## 🔗 **PARTE 10: ARQUIVOS QUE SERÃO CRIADOS/MODIFICADOS**

### **Novos Arquivos:**
```
✅ drizzle/migrations/0014_cargo_classification.sql
✅ src/services/fiscal/nfe-classifier.ts
✅ src/app/api/tms/cargo-repository/route.ts
✅ src/app/api/tms/cargo-repository/[id]/assign/route.ts
✅ src/app/api/tms/cargo-repository/[id]/cancel/route.ts
✅ src/app/(dashboard)/tms/repositorio-cargas/page.tsx
✅ src/components/tms/cargo-card.tsx (opcional)
```

### **Arquivos Modificados:**
```
✅ src/lib/db/schema.ts (3 tabelas)
✅ src/services/sefaz-processor.ts (classificação)
✅ src/services/fiscal/cte-builder.ts (vincular NFes)
✅ src/app/(dashboard)/fiscal/entrada-notas/page.tsx (filtro)
✅ src/app/(dashboard)/tms/viagens/create (modal - step cargas)
✅ src/components/layout/aura-glass-sidebar.tsx (novo link)
```

---

**🎯 DECISÃO FINAL: Este planejamento está APROVADO para execução?**

Se sim, vou começar pelo BLOCO 1 e seguir sequencialmente até completar os 3 blocos!







