# 🎯 ANÁLISE: CENTROS DE CUSTO NA NOVA ESTRUTURA AURA CORE

**Data:** 10/12/2025  
**Solicitação:** Localizar e analisar Centros de Custo na nova estrutura Fiscal → Contábil → Financeiro

---

## ✅ **RESUMO EXECUTIVO**

### **LOCALIZAÇÃO:**
- ✅ **Tabela:** `financial_cost_centers`
- ✅ **API:** `/api/financial/cost-centers/*`
- ✅ **Frontend:** `/financeiro/centros-custo`
- ✅ **Schema:** `src/lib/db/schema` (costCenters)

### **STATUS:**
- ✅ **IMPLEMENTADO** (backend completo)
- ✅ **FRONTEND ATIVO** (com AG Grid Aurora)
- 🟡 **PARCIALMENTE INTEGRADO** (falta integração com journal_entry_lines)

---

## 📁 **ESTRUTURA ATUAL**

### **1. TABELA NO BANCO DE DADOS**

```sql
CREATE TABLE financial_cost_centers(
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  
  -- Identificação
  code NVARCHAR(50) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  
  -- Hierarquia
  parent_id INT,                    -- ✅ Suporta hierarquia
  level INT DEFAULT 0,              -- ✅ Nível da árvore
  type NVARCHAR(20) NOT NULL,       -- ANALYTIC ou SYNTHETIC
  is_analytical BIT DEFAULT 1,      -- Se aceita lançamentos
  
  -- Integração Frota
  linked_vehicle_id INT,            -- ✅ Link com veículo específico
  
  -- Status
  status NVARCHAR(20) DEFAULT 'ACTIVE',
  
  -- Auditoria
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (parent_id) REFERENCES financial_cost_centers(id)
);

CREATE INDEX idx_cost_centers_org ON financial_cost_centers(organization_id);
CREATE INDEX idx_cost_centers_parent ON financial_cost_centers(parent_id);
CREATE INDEX idx_cost_centers_vehicle ON financial_cost_centers(linked_vehicle_id);
```

---

### **2. APIs DISPONÍVEIS**

#### **✅ IMPLEMENTADAS:**

| **Endpoint** | **Método** | **Função** | **Status** |
|-------------|-----------|------------|------------|
| `/api/financial/cost-centers` | GET | Lista todos (hierárquico) | ✅ OK |
| `/api/financial/cost-centers` | POST | Cria novo CC | ✅ OK |
| `/api/financial/cost-centers/[id]` | PUT | Atualiza CC | ✅ OK |
| `/api/financial/cost-centers/[id]` | DELETE | Soft delete | ✅ OK |
| `/api/financial/cost-centers/analytical` | GET | Apenas analíticos | ✅ OK |

#### **Recursos:**
- ✅ Retorna estrutura flat + tree
- ✅ Validação de código único
- ✅ Hierarquia pai-filho
- ✅ Soft delete
- ✅ Multi-tenant (organization_id)

---

### **3. FRONTEND**

**Localização:** `/financeiro/centros-custo`

**Recursos Implementados:**
- ✅ AG Grid Enterprise com tema Aurora
- ✅ KPI Cards animados (3 cards)
- ✅ CRUD completo (Create, Read, Update, Delete)
- ✅ Hierarquia visual (indentação por nível)
- ✅ Filtros avançados (Text, Set)
- ✅ Floating Filters
- ✅ Quick Filter (busca global)
- ✅ Sidebar com colunas

**KPI Cards:**
```typescript
1. Total de Centros (NumberCounter animado)
2. Centros Analíticos (badge verde)
3. Centros Sintéticos (badge azul)
```

---

## 🔗 **INTEGRAÇÃO COM NOVA ESTRUTURA**

### **✅ O QUE JÁ ESTÁ INTEGRADO:**

#### **1. Contas a Pagar/Receber**
```sql
-- accounts_payable
cost_center_id INT,
FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id)

-- accounts_receivable
cost_center_id INT,
FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id)
```
**Status:** ✅ **INTEGRADO**

#### **2. Plano de Contas**
```sql
-- chart_of_accounts
accepts_cost_center BIT DEFAULT 0,    -- Se aceita CC
requires_cost_center BIT DEFAULT 0,   -- Se EXIGE CC
```
**Status:** ✅ **INTEGRADO** (regras de negócio)

#### **3. Frota**
```sql
-- financial_cost_centers
linked_vehicle_id INT  -- Link 1:1 com veículo
```
**Status:** ✅ **INTEGRADO** (permite rastreio de custo por veículo)

---

### **❌ O QUE AINDA NÃO ESTÁ INTEGRADO:**

#### **1. Lançamentos Contábeis (journal_entry_lines)**

**Problema:** Não existe coluna `cost_center_id` em `journal_entry_lines`!

```sql
-- journal_entry_lines (ATUAL - sem CC)
CREATE TABLE journal_entry_lines (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  journal_entry_id BIGINT NOT NULL,
  chart_account_id INT NOT NULL,
  debit_amount DECIMAL(18,2),
  credit_amount DECIMAL(18,2),
  description NVARCHAR(MAX),
  -- ❌ FALTA: cost_center_id INT
);
```

**Deveria ser:**
```sql
-- journal_entry_lines (CORRETO - com CC)
CREATE TABLE journal_entry_lines (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  journal_entry_id BIGINT NOT NULL,
  chart_account_id INT NOT NULL,
  cost_center_id INT,  -- ✅ ADICIONAR!
  debit_amount DECIMAL(18,2),
  credit_amount DECIMAL(18,2),
  description NVARCHAR(MAX),
  
  FOREIGN KEY (chart_account_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id)
);
```

**Impacto:**
- ❌ Lançamentos contábeis NÃO podem ser rastreados por CC
- ❌ DRE por Centro de Custo não funciona corretamente
- ❌ Relatório de Custos por CC incompleto

---

#### **2. Itens de Documentos Fiscais (fiscal_document_items)**

**Problema:** Não existe coluna `cost_center_id` em `fiscal_document_items`!

```sql
-- fiscal_document_items (ATUAL - sem CC)
CREATE TABLE fiscal_document_items (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  fiscal_document_id BIGINT NOT NULL,
  category_id INT,
  chart_account_id INT,
  -- ❌ FALTA: cost_center_id INT
);
```

**Deveria ser:**
```sql
-- fiscal_document_items (CORRETO - com CC)
CREATE TABLE fiscal_document_items (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  fiscal_document_id BIGINT NOT NULL,
  category_id INT,
  chart_account_id INT,
  cost_center_id INT,  -- ✅ ADICIONAR!
  
  FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id)
);
```

**Impacto:**
- ❌ Não é possível alocar itens de NFe a Centros de Custo
- ❌ Classificação automática não distribui por CC
- ❌ Relatórios gerenciais ficam incompletos

---

## 📊 **BENCHMARK: TOTVS vs. AURA CORE**

### **ESTRUTURA DE CENTROS DE CUSTO (Totvs):**

```
001 - OPERACIONAL (SINTÉTICO)
  001.01 - Transporte Próprio (SINTÉTICO)
    001.01.001 - Frota Leves (ANALÍTICO)
      → Vincula veículo ABC-1234
    001.01.002 - Frota Pesados (ANALÍTICO)
      → Vincula veículo DEF-5678
  001.02 - Transporte Terceiros (SINTÉTICO)
    001.02.001 - Terceiros Nacional (ANALÍTICO)
    001.02.002 - Terceiros Internacional (ANALÍTICO)

002 - ADMINISTRATIVO (SINTÉTICO)
  002.01 - RH (ANALÍTICO)
  002.02 - TI (ANALÍTICO)
  002.03 - Financeiro (ANALÍTICO)
```

### **COMPARAÇÃO:**

| **Recurso** | **Aura Core** | **Totvs Protheus** | **Status** |
|------------|--------------|-------------------|-----------|
| **Hierarquia** | ✅ Sim (parent_id, level) | ✅ Sim | ✅ **IGUAL** |
| **Analítico/Sintético** | ✅ Sim (type, is_analytical) | ✅ Sim | ✅ **IGUAL** |
| **Link com Veículo** | ✅ Sim (linked_vehicle_id) | ❌ Não nativo | ✅ **VANTAGEM AURA** |
| **Multi-tenant** | ✅ Sim (organization_id) | ❌ Não | ✅ **VANTAGEM AURA** |
| **CC em Lançamentos** | ❌ **NÃO** | ✅ Sim | ❌ **CRÍTICO** |
| **CC em NFe Items** | ❌ **NÃO** | ✅ Sim | ❌ **CRÍTICO** |
| **Rateio Multi-CC** | ❌ Não | ✅ Sim | 🟡 **FALTA** |
| **Classe (Receita/Despesa)** | ❌ Não | ✅ Sim | 🟡 **FALTA** |
| **Validação ao Excluir** | ❌ Não valida uso | ✅ RESTRICT | ❌ **CRÍTICO** |

---

## 🚨 **PROBLEMAS CRÍTICOS IDENTIFICADOS**

### **PROBLEMA 1: Centro de Custo AUSENTE em Lançamentos Contábeis**

**Cenário Real:**
```
1. Importa NFe de Combustível (R$5.000)
2. Quer alocar ao CC "001.01.001 - Frota Leves"
3. Sistema gera lançamento contábil
4. ❌ PROBLEMA: Lançamento NÃO tem cost_center_id!
5. ❌ DRE por CC mostra R$0 em Combustível
6. ❌ Relatório de Custos por Veículo quebra
```

**Como Totvs Resolve:**
```sql
-- ✅ TOTVS: Lançamento contábil COM CC
INSERT INTO journal_entry_lines (
  journal_entry_id,
  chart_account_id,
  cost_center_id,  -- ✅ OBRIGATÓRIO!
  debit_amount
) VALUES (
  1234,
  4010100,  -- 4.01.01.001 - Combustível
  10,       -- 001.01.001 - Frota Leves
  5000.00
);
```

---

### **PROBLEMA 2: Exclusão Sem Validação**

**Cenário Real:**
```
1. Cria CC "Frota Leves"
2. Aloca 500 lançamentos contábeis neste CC
3. Aloca 100 contas a pagar
4. Usuário exclui CC "Frota Leves"
5. ❌ PROBLEMA: Lançamentos ficam órfãos!
6. ❌ PROBLEMA: Relatórios quebram!
```

**Como Totvs Resolve:**
```sql
-- ✅ TOTVS: Valida ANTES de excluir
IF EXISTS (
  SELECT 1 FROM journal_entry_lines 
  WHERE cost_center_id = @id AND deleted_at IS NULL
)
BEGIN
  DECLARE @count INT;
  SELECT @count = COUNT(*) 
  FROM journal_entry_lines 
  WHERE cost_center_id = @id;
  
  RAISERROR('Centro de Custo possui %d lançamentos contábeis.
             Não é possível excluir.
             Alternativa: Desativar (Status = INACTIVE).', 
             16, 1, @count);
  RETURN;
END
```

---

## 🔧 **PLANO DE CORREÇÃO**

### **FASE 1: INTEGRAÇÃO COM LANÇAMENTOS CONTÁBEIS (CRÍTICA) 🔴**

#### **1.1 Adicionar cost_center_id em journal_entry_lines**

```sql
-- Migration: add_cost_center_to_journal_entries.sql

-- Adicionar coluna
ALTER TABLE journal_entry_lines
ADD cost_center_id INT NULL;

-- Adicionar FK
ALTER TABLE journal_entry_lines
ADD CONSTRAINT FK_journal_entry_lines_cost_center
FOREIGN KEY (cost_center_id) 
REFERENCES financial_cost_centers(id);

-- Adicionar índice
CREATE INDEX idx_journal_entry_lines_cost_center 
ON journal_entry_lines(cost_center_id);
```

**Tempo:** 30min

---

#### **1.2 Validar CC Obrigatório Baseado no Plano de Contas**

```typescript
// src/services/accounting-engine.ts

export async function createJournalEntry(data: JournalEntryInput) {
  for (const line of data.lines) {
    const account = await db.query.chartOfAccounts.findFirst({
      where: eq(chartOfAccounts.id, line.chartAccountId)
    });
    
    // ✅ VALIDAÇÃO: Se conta EXIGE CC
    if (account.requiresCostCenter && !line.costCenterId) {
      throw new Error(
        `Conta "${account.code} - ${account.name}" EXIGE Centro de Custo.
         
         Por favor, selecione um Centro de Custo analítico para esta linha.`
      );
    }
    
    // ✅ VALIDAÇÃO: Se CC é analítico
    if (line.costCenterId) {
      const costCenter = await db.query.costCenters.findFirst({
        where: eq(costCenters.id, line.costCenterId)
      });
      
      if (!costCenter.isAnalytical) {
        throw new Error(
          `Centro de Custo "${costCenter.code} - ${costCenter.name}" é SINTÉTICO.
           
           Lançamentos devem ser feitos em CCs ANALÍTICOS.`
        );
      }
    }
  }
  
  // Continua...
}
```

**Tempo:** 1h

---

### **FASE 2: INTEGRAÇÃO COM DOCUMENTOS FISCAIS (CRÍTICA) 🔴**

#### **2.1 Adicionar cost_center_id em fiscal_document_items**

```sql
-- Migration: add_cost_center_to_fiscal_items.sql

-- Adicionar coluna
ALTER TABLE fiscal_document_items
ADD cost_center_id INT NULL;

-- Adicionar FK
ALTER TABLE fiscal_document_items
ADD CONSTRAINT FK_fiscal_document_items_cost_center
FOREIGN KEY (cost_center_id) 
REFERENCES financial_cost_centers(id);

-- Adicionar índice
CREATE INDEX idx_fiscal_document_items_cost_center 
ON fiscal_document_items(cost_center_id);
```

**Tempo:** 30min

---

#### **2.2 Atualizar Tela de Edição de Documento Fiscal**

```typescript
// src/app/(dashboard)/fiscal/documentos/[id]/editar/page.tsx

// ✅ ADICIONAR coluna "Centro de Custo" na tabela de itens
{
  headerName: "Centro de Custo",
  field: "costCenterId",
  width: 200,
  editable: true,
  cellEditor: "agSelectCellEditor",
  cellEditorParams: {
    values: analyticalCostCenters.map(cc => ({
      value: cc.id,
      label: `${cc.code} - ${cc.name}`
    }))
  }
}
```

**Tempo:** 1h

---

### **FASE 3: VALIDAÇÕES DE INTEGRIDADE (CRÍTICA) 🔴**

#### **3.1 Bloquear Exclusão de CC com Lançamentos**

```typescript
// src/app/api/financial/cost-centers/[id]/route.ts

export async function DELETE(req: Request, { params }: any) {
  const { id } = await params;
  
  // ✅ Validar lançamentos contábeis
  const journalCount = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM journal_entry_lines 
    WHERE cost_center_id = ${parseInt(id)}
      AND deleted_at IS NULL
  `);
  
  if (journalCount[0].count > 0) {
    return NextResponse.json({
      error: `❌ Centro de Custo possui ${journalCount[0].count} lançamentos contábeis.
              Não é possível excluir.
              Alternativa: Desativar (Status = INACTIVE).`,
      code: "HAS_JOURNAL_ENTRIES",
      count: journalCount[0].count
    }, { status: 400 });
  }
  
  // ✅ Validar contas a pagar
  const payablesCount = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM accounts_payable 
    WHERE cost_center_id = ${parseInt(id)}
      AND deleted_at IS NULL
  `);
  
  if (payablesCount[0].count > 0) {
    return NextResponse.json({
      error: `❌ Centro de Custo possui ${payablesCount[0].count} contas a pagar.
              Não é possível excluir.`,
      code: "HAS_PAYABLES",
      count: payablesCount[0].count
    }, { status: 400 });
  }
  
  // ✅ Validar CCs filhos
  const childrenCount = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM financial_cost_centers 
    WHERE parent_id = ${parseInt(id)}
      AND deleted_at IS NULL
  `);
  
  if (childrenCount[0].count > 0) {
    return NextResponse.json({
      error: `❌ Centro de Custo possui ${childrenCount[0].count} centros de custo filhos.
              Exclua ou mova os filhos primeiro.`,
      code: "HAS_CHILDREN",
      count: childrenCount[0].count
    }, { status: 400 });
  }
  
  // ✅ Se passou, permite soft delete
  await db.execute(sql`
    UPDATE financial_cost_centers 
    SET deleted_at = GETDATE(),
        status = 'INACTIVE',
        updated_by = ${session.user.id}
    WHERE id = ${parseInt(id)}
  `);
  
  return NextResponse.json({ success: true });
}
```

**Tempo:** 1h

---

## 📋 **RESUMO: CENTROS DE CUSTO NA NOVA ESTRUTURA**

### **✅ O QUE JÁ EXISTE:**
1. ✅ Tabela `financial_cost_centers` completa
2. ✅ APIs CRUD funcionais
3. ✅ Frontend Aurora com AG Grid
4. ✅ Hierarquia pai-filho
5. ✅ Analítico/Sintético
6. ✅ Link com veículos (diferencial!)
7. ✅ Multi-tenant
8. ✅ Soft delete

### **❌ O QUE ESTÁ FALTANDO (CRÍTICO):**
1. ❌ **cost_center_id em journal_entry_lines** (DRE por CC quebrado)
2. ❌ **cost_center_id em fiscal_document_items** (Classificação incompleta)
3. ❌ **Validação ao excluir** (permite órfãos)
4. ❌ **Validação de CC obrigatório** (quando conta exige)

### **🟡 O QUE SERIA BOM TER (MELHORIAS):**
1. 🟡 Rateio Multi-CC (1 lançamento em 2+ CCs)
2. 🟡 Classe (Receita/Despesa/Ambos)
3. 🟡 Bloqueio de edição de código após uso
4. 🟡 Auditoria detalhada

---

## 🎯 **RECOMENDAÇÃO**

**IMPLEMENTAR FASES 1, 2 E 3 URGENTEMENTE!**

**Justificativa:**
- 🔴 **Sem cost_center_id em lançamentos:** DRE por CC não funciona
- 🔴 **Sem validação de exclusão:** Dados podem ser perdidos
- 🔴 **Sem integração fiscal:** Classificação automática incompleta

**Tempo Total:** ~5h (3 fases)

---

## ✅ **APROVAÇÃO NECESSÁRIA**

**Qual ação você deseja?**

**A)** 🔴 **Implementar Fases 1+2+3 AGORA** (~5h) - **RECOMENDADO**  
   - Integra CC com lançamentos contábeis
   - Integra CC com documentos fiscais
   - Adiciona validações de integridade
   
**B)** 🟡 Apenas Fase 1 (Lançamentos Contábeis, ~2h) - Mínimo

**C)** 🟢 Deixar para depois (arriscado para relatórios)

---

**Aguardo sua decisão!** 🚀



