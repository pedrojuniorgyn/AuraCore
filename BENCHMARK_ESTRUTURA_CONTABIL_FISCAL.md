# 📊 BENCHMARK: ESTRUTURA CONTÁBIL-FISCAL DO AURA CORE

**Autor:** Análise Técnica como Auditor Fiscal + Contador CRC + Desenvolvedor ERP Senior  
**Data:** 10/12/2025  
**Objetivo:** Avaliar conformidade do Aura Core com padrões de mercado (Totvs, SAP, Oracle) e normas contábeis brasileiras (NBC TG, CFC)

---

## 🎯 ESCOPO DA ANÁLISE

### **3 Pilares Críticos:**

1. **Plano de Contas (Chart of Accounts)**
   - Estrutura hierárquica
   - Códigos significativos vs. sequenciais
   - Contas sintéticas vs. analíticas
   - Regras de exclusão/edição

2. **Centros de Custo (Cost Centers)**
   - Estrutura hierárquica
   - Códigos e nomenclatura
   - Rastreabilidade

3. **Categorias Financeiras (Financial Categories)**
   - Relação com Plano de Contas
   - Impacto em classificação automática
   - Regras de integridade

---

## 📚 BENCHMARK: TOTVS PROTHEUS

### **1. PLANO DE CONTAS**

#### **Estrutura Hierárquica (Padrão Totvs):**

```
NÍVEL 0 (Classe)
└─ 1 - ATIVO
   └─ NÍVEL 1 (Grupo)
      └─ 1.1 - Ativo Circulante
         └─ NÍVEL 2 (Subgrupo)
            └─ 1.1.01 - Caixa e Equivalentes
               └─ NÍVEL 3 (Conta Analítica)
                  └─ 1.1.01.001 - Caixa Matriz
                  └─ 1.1.01.002 - Banco Bradesco CC 12345
```

#### **Regras Totvs:**

| **Regra** | **Totvs Protheus** | **Justificativa** |
|-----------|-------------------|-------------------|
| **Código** | Significativo (1.1.01.001) | Facilita leitura e hierarquia |
| **Sequência** | NÃO sequencial (não é 1, 2, 3...) | Permite inserções no meio |
| **Hierarquia** | Obrigatória (até 5 níveis) | Permite consolidação |
| **Exclusão** | **BLOQUEADA** se tiver lançamentos | Integridade contábil |
| **Edição Código** | **BLOQUEADA** após lançamentos | Auditoria |
| **Edição Nome** | Permitida (com auditoria) | Correção de cadastros |
| **Desativação** | Permitida (status INACTIVE) | Evita perda de histórico |
| **Tipo de Conta** | 5 tipos (Ativo, Passivo, PL, Receita, Despesa) | NBC TG 26 |
| **Sintética vs Analítica** | Sintética: soma filhas / Analítica: recebe lançamentos | Regra contábil |
| **Centro de Custo** | Campo opcional por conta | Granularidade |

#### **Validações Críticas (Totvs):**

```sql
-- ❌ NÃO permite excluir conta com lançamentos
IF EXISTS (SELECT 1 FROM journal_entry_lines WHERE chart_account_id = @id)
  THROW 'Conta possui lançamentos contábeis e não pode ser excluída'

-- ❌ NÃO permite excluir conta SINTÉTICA com filhas
IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE parent_id = @id)
  THROW 'Conta possui contas filhas e não pode ser excluída'

-- ❌ NÃO permite lançar em conta SINTÉTICA
IF (SELECT is_analytical FROM chart_of_accounts WHERE id = @id) = 0
  THROW 'Conta sintética não aceita lançamentos diretos'

-- ✅ PERMITE desativar (soft delete)
UPDATE chart_of_accounts SET status = 'INACTIVE' WHERE id = @id
```

---

### **2. CENTROS DE CUSTO**

#### **Estrutura Totvs:**

```
NÍVEL 0 (Grupo Principal)
└─ 001 - OPERACIONAL
   └─ NÍVEL 1 (Subgrupo)
      └─ 001.01 - Transporte Próprio
         └─ NÍVEL 2 (Centro de Custo)
            └─ 001.01.001 - Frota Veículos Leves
            └─ 001.01.002 - Frota Veículos Pesados
```

#### **Regras Totvs:**

| **Regra** | **Totvs** | **Justificativa** |
|-----------|----------|-------------------|
| **Código** | Sequencial ou Significativo | Depende do porte |
| **Hierarquia** | Opcional (mas recomendada) | Consolidação gerencial |
| **Exclusão** | **BLOQUEADA** se usado | Rastreabilidade |
| **Classe** | Receita/Despesa/Ambos | Controle por tipo |
| **Rateio** | Suportado (multi-CC) | Custos compartilhados |

---

### **3. CATEGORIAS FINANCEIRAS**

#### **Totvs NÃO tem "Categorias Financeiras" separadas:**

**Por que?**
- Totvs usa **Plano de Contas** direto (mais robusto)
- "Categorias" são para **fluxo de caixa gerencial**, não contabilidade

**No Aura Core:**
- `financial_categories` é uma camada **operacional** (simplificada)
- Mapeia para `chart_of_accounts` (camada contábil)
- **Válido para TMS**, mas precisa de regras!

---

## 📚 BENCHMARK: SAP BUSINESS ONE

### **1. PLANO DE CONTAS (G/L Accounts)**

#### **Estrutura SAP:**

```
Classe → Grupo → Conta
1000000 - ATIVO
  1100000 - Ativo Circulante
    1110000 - Caixa e Bancos
      1110100 - Caixa Matriz
      1110200 - Banco Bradesco
```

#### **Regras SAP:**

| **Aspecto** | **SAP Business One** | **Diferencial** |
|------------|---------------------|-----------------|
| **Código** | Numérico puro (7 dígitos) | 1110100, 1110200 |
| **Exclusão** | **RESTRICT** (erro se usado) | Mais restritivo que Totvs |
| **Edição** | Apenas nome/descrição | Código **imutável** |
| **Auditoria** | Log completo de mudanças | Compliance SOX |
| **Validação** | Regra de débito/crédito | Valida balanceamento |

---

## 📚 BENCHMARK: ORACLE NETSUITE

### **1. PLANO DE CONTAS**

#### **Estrutura Oracle:**

```
1000 - ASSETS
  1100 - Current Assets
    1110 - Cash & Cash Equivalents
      1111 - Petty Cash
      1112 - Bank Account - Checking
```

#### **Regras Oracle:**

| **Aspecto** | **Oracle NetSuite** | **Diferencial** |
|------------|-------------------|-----------------|
| **Código** | Numérico (4 dígitos por nível) | Flexível |
| **Inactive** | Status INACTIVE (não exclui) | **Nunca exclui fisicamente** |
| **Parent** | Bloqueio ao alterar se tem filhas | Hierarquia rígida |
| **Subsidiaries** | Multi-empresa nativo | Global |

---

## 📜 NORMAS CONTÁBEIS BRASILEIRAS (NBC TG)

### **NBC TG 26 - Apresentação das Demonstrações Contábeis**

#### **Exigências Legais:**

1. **Classificação Mínima (DRE):**
   ```
   3. RECEITA OPERACIONAL BRUTA
      3.1 Vendas de Produtos
      3.2 Prestação de Serviços
   4. DESPESAS OPERACIONAIS
      4.1 Despesas com Pessoal
      4.2 Despesas Administrativas
      4.3 Despesas com Veículos
   ```

2. **Classificação Mínima (Balanço):**
   ```
   1. ATIVO
      1.1 Circulante
      1.2 Não Circulante
   2. PASSIVO
      2.1 Circulante
      2.2 Não Circulante
   ```

3. **Rastreabilidade:**
   - **Auditoria externa exige:** Histórico completo de alterações
   - **Lei 6.404/76 (Lei das S.A.):** Proíbe alteração retroativa

---

## 🔍 ANÁLISE DO AURA CORE ATUAL

### **1. PLANO DE CONTAS**

#### **✅ O QUE ESTÁ CORRETO:**

```typescript
// ✅ Hierarquia implementada
parentId: number | null,
level: number,

// ✅ Tipos contábeis corretos
type: "REVENUE" | "EXPENSE" | "ASSET" | "LIABILITY" | "EQUITY"

// ✅ Soft delete implementado
deleted_at: datetime2,

// ✅ Auditoria básica
created_by, updated_by, created_at, updated_at

// ✅ Status ACTIVE/INACTIVE
status: NVARCHAR(20)

// ✅ Contas analíticas vs. sintéticas
is_analytical: boolean
```

#### **❌ O QUE ESTÁ FALTANDO:**

| **Item** | **Aura Core Atual** | **Deveria Ser** | **Criticidade** |
|----------|-------------------|-----------------|-----------------|
| **Validação de Exclusão** | Soft delete sem validar uso | **RESTRICT** se tiver lançamentos | 🔴 **CRÍTICA** |
| **Bloqueio de Edição de Código** | Permite editar código | Bloquear após 1º lançamento | 🔴 **CRÍTICA** |
| **Validação de Conta Sintética** | Não valida lançamento | Bloquear lançamento em sintética | 🔴 **CRÍTICA** |
| **Código Sequencial** | IDENTITY(1,1) no ID | Código **significativo** (1.1.01.001) | 🟡 **MÉDIA** |
| **Histórico de Alterações** | Apenas updated_at | Tabela de auditoria detalhada | 🟡 **MÉDIA** |
| **Validação de Hierarquia** | Permite parentId inválido | Validar árvore circular | 🟡 **MÉDIA** |
| **Restrição ON DELETE** | Sem restrição FK | ON DELETE RESTRICT | 🔴 **CRÍTICA** |

---

### **2. CATEGORIAS FINANCEIRAS**

#### **✅ O QUE ESTÁ CORRETO:**

```typescript
// ✅ Estrutura simples (operacional)
id, name, code, type, description

// ✅ Soft delete
deleted_at

// ✅ Multi-tenant
organization_id
```

#### **❌ O QUE ESTÁ FALTANDO:**

| **Item** | **Atual** | **Deveria Ser** | **Criticidade** |
|----------|-----------|-----------------|-----------------|
| **Validação de Exclusão** | Soft delete sem validar | **RESTRICT** se usada em NFes | 🔴 **CRÍTICA** |
| **Mapeamento Obrigatório** | Pode criar sem mapear para Plano de Contas | Exigir chart_account_id | 🟡 **MÉDIA** |
| **Código Único** | Não valida unicidade de código | UNIQUE constraint | 🟡 **MÉDIA** |

---

### **3. CENTROS DE CUSTO**

#### **✅ O QUE ESTÁ CORRETO:**

```typescript
// ✅ Estrutura básica
id, code, name, description

// ✅ Multi-tenant
organization_id
```

#### **❌ O QUE ESTÁ FALTANDO:**

| **Item** | **Atual** | **Deveria Ser** | **Criticidade** |
|----------|-----------|-----------------|-----------------|
| **Hierarquia** | Não implementada | parent_id, level | 🟡 **MÉDIA** |
| **Classe** | Não tem | Receita/Despesa/Ambos | 🟡 **MÉDIA** |
| **Validação de Exclusão** | Soft delete sem validar | RESTRICT se usado | 🔴 **CRÍTICA** |
| **Rateio Multi-CC** | Não implementado | Tabela de rateios | 🟢 **BAIXA** |

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### **PROBLEMA 1: EXCLUSÃO SEM VALIDAÇÃO ⚠️**

#### **Cenário Real:**

```
1. Usuário cria categoria "Combustível"
2. Importa 100 NFes de posto de gasolina
3. Gera lançamentos contábeis
4. Usuário exclui categoria "Combustível"
5. ❌ PROBLEMA: NFes ficam sem categoria!
6. ❌ PROBLEMA: Lançamentos contábeis órfãos!
7. ❌ PROBLEMA: DRE desconfigura!
```

#### **Como Totvs Resolve:**

```sql
-- ✅ TOTVS valida ANTES de excluir
IF EXISTS (
  SELECT 1 FROM fiscal_document_items 
  WHERE category_id = @id AND deleted_at IS NULL
)
BEGIN
  RAISERROR('Categoria possui 15 documentos fiscais vinculados. 
             Não é possível excluir. 
             Alternativa: Desativar a categoria.', 16, 1);
  RETURN;
END

-- ✅ Se passou, faz soft delete
UPDATE financial_categories 
SET deleted_at = GETDATE(), 
    status = 'INACTIVE'
WHERE id = @id;
```

---

### **PROBLEMA 2: EDIÇÃO DE CÓDIGO APÓS LANÇAMENTOS ⚠️**

#### **Cenário Real:**

```
1. Plano de Contas tem código "4.1.01" (Despesas Combustível)
2. Gera 1000 lançamentos contábeis
3. Contador edita código para "4.2.01"
4. ❌ PROBLEMA: Balanço de 2024 mostra "4.1.01"
5. ❌ PROBLEMA: DRE de 2025 mostra "4.2.01"
6. ❌ PROBLEMA: Relatórios comparativos quebram!
7. ❌ PROBLEMA: Auditoria externa reprova!
```

#### **Como SAP Resolve:**

```typescript
// ✅ SAP BLOQUEIA edição de código
export async function PUT(id: number, body: any) {
  // Verificar se já tem lançamentos
  const hasEntries = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM journal_entry_lines 
    WHERE chart_account_id = ${id}
  `);

  if (hasEntries[0].count > 0 && body.code !== currentCode) {
    return NextResponse.json({
      error: "Código não pode ser alterado. Esta conta possui lançamentos contábeis.",
      suggestion: "Crie uma nova conta com o código desejado e transfira os lançamentos futuros."
    }, { status: 400 });
  }

  // Permite editar APENAS nome/descrição
  await db.execute(sql`
    UPDATE chart_of_accounts 
    SET name = ${body.name},
        description = ${body.description},
        updated_at = GETDATE()
    WHERE id = ${id}
  `);
}
```

---

### **PROBLEMA 3: LANÇAMENTO EM CONTA SINTÉTICA ⚠️**

#### **Cenário Real:**

```
1. Conta "4.1" é sintética (tem filhas: 4.1.01, 4.1.02)
2. Sistema permite lançar R$1000 em "4.1"
3. ❌ PROBLEMA: DRE duplica o valor!
4. ❌ PROBLEMA: Conta "4.1" = R$1000 (lançamento direto)
5. ❌ PROBLEMA: Conta "4.1" = R$5000 (soma das filhas)
6. ❌ PROBLEMA: Total = R$6000 (ERRADO!)
```

#### **Como Oracle Resolve:**

```typescript
// ✅ ORACLE valida antes de lançar
export async function createJournalEntry(data: any) {
  for (const line of data.lines) {
    const account = await db.query.chartOfAccounts.findFirst({
      where: eq(chartOfAccounts.id, line.chartAccountId)
    });

    if (!account.isAnalytical) {
      throw new Error(
        `Conta "${account.code} - ${account.name}" é SINTÉTICA. 
         Lançamentos devem ser feitos nas contas analíticas:
         ${account.children.map(c => c.code).join(', ')}`
      );
    }
  }

  // Continua...
}
```

---

## 📊 ESTRUTURA RECOMENDADA PARA TRANSPORTE/LOGÍSTICA

### **PLANO DE CONTAS PADRÃO (NBC TG 26):**

```
1. ATIVO
   1.1 Ativo Circulante
       1.1.01 Caixa e Equivalentes
              1.1.01.001 - Caixa Matriz
              1.1.01.002 - Banco Bradesco CC
       1.1.02 Contas a Receber
              1.1.02.001 - Clientes Nacionais
              1.1.02.002 - Fretes a Receber
   1.2 Ativo Não Circulante
       1.2.01 Imobilizado
              1.2.01.001 - Veículos
              1.2.01.002 - Implementos Rodoviários

2. PASSIVO
   2.1 Passivo Circulante
       2.1.01 Fornecedores
              2.1.01.001 - Fornecedores de Combustível
              2.1.01.002 - Fornecedores de Peças
       2.1.02 Obrigações Trabalhistas
              2.1.02.001 - Salários a Pagar
              2.1.02.002 - FGTS a Recolher

3. RECEITAS
   3.1 Receita Operacional Bruta
       3.1.01 Receita de Fretes
              3.1.01.001 - Frete Rodoviário CIF
              3.1.01.002 - Frete Rodoviário FOB
       3.1.02 Outras Receitas Operacionais
              3.1.02.001 - Armazenagem
              3.1.02.002 - Despacho Aduaneiro

4. DESPESAS
   4.1 Despesas Operacionais
       4.1.01 Despesas com Veículos
              4.1.01.001 - Combustível
              4.1.01.002 - Manutenção
              4.1.01.003 - Licenciamento
              4.1.01.004 - IPVA
              4.1.01.005 - Seguro de Veículos
       4.1.02 Despesas com Pessoal
              4.1.02.001 - Salários
              4.1.02.002 - Encargos Sociais
       4.1.03 Despesas Administrativas
              4.1.03.001 - Aluguel
              4.1.03.002 - Energia Elétrica
              4.1.03.003 - Telefonia
       4.1.04 Despesas Tributárias
              4.1.04.001 - ICMS a Recolher
              4.1.04.002 - PIS s/ Faturamento
              4.1.04.003 - COFINS s/ Faturamento
```

---

## 🔧 PLANO DE CORREÇÃO DO AURA CORE

### **FASE 1: VALIDAÇÕES DE INTEGRIDADE (CRÍTICA) 🔴**

#### **1.1 Bloquear Exclusão de Conta com Lançamentos**

```sql
-- Migration: add_chart_accounts_integrity.sql

-- ✅ Validação ANTES de excluir
CREATE TRIGGER trg_validate_chart_account_delete
ON chart_of_accounts
INSTEAD OF DELETE
AS
BEGIN
  DECLARE @id INT, @code NVARCHAR(50), @name NVARCHAR(255);
  
  SELECT @id = id, @code = code, @name = name FROM deleted;
  
  -- Verificar lançamentos contábeis
  IF EXISTS (
    SELECT 1 FROM journal_entry_lines 
    WHERE chart_account_id = @id AND deleted_at IS NULL
  )
  BEGIN
    DECLARE @count INT;
    SELECT @count = COUNT(*) FROM journal_entry_lines 
    WHERE chart_account_id = @id AND deleted_at IS NULL;
    
    RAISERROR('❌ Conta "%s - %s" possui %d lançamentos contábeis.
               Não é possível excluir.
               Alternativa: Desativar a conta (Status = INACTIVE).', 
               16, 1, @code, @name, @count);
    RETURN;
  END
  
  -- Verificar contas filhas
  IF EXISTS (
    SELECT 1 FROM chart_of_accounts 
    WHERE parent_id = @id AND deleted_at IS NULL
  )
  BEGIN
    DECLARE @children NVARCHAR(MAX);
    SELECT @children = STRING_AGG(code, ', ') 
    FROM chart_of_accounts 
    WHERE parent_id = @id AND deleted_at IS NULL;
    
    RAISERROR('❌ Conta "%s - %s" possui contas filhas: %s
               Exclua ou mova as contas filhas primeiro.', 
               16, 1, @code, @name, @children);
    RETURN;
  END
  
  -- Se passou, permite soft delete
  UPDATE chart_of_accounts 
  SET deleted_at = GETDATE(), 
      status = 'INACTIVE'
  WHERE id = @id;
END;
```

#### **1.2 Bloquear Edição de Código após Lançamentos**

```typescript
// src/app/api/financial/chart-accounts/[id]/route.ts

export async function PUT(req: Request, { params }: any) {
  const { id } = await params;
  const body = await req.json();
  
  // ✅ Buscar conta atual
  const currentAccount = await db.query.chartOfAccounts.findFirst({
    where: eq(chartOfAccounts.id, parseInt(id))
  });
  
  // ✅ Se tentou mudar o código, validar
  if (body.code && body.code !== currentAccount.code) {
    const hasEntries = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM journal_entry_lines 
      WHERE chart_account_id = ${parseInt(id)}
        AND deleted_at IS NULL
    `);
    
    if (hasEntries[0].count > 0) {
      return NextResponse.json({
        error: `❌ Código não pode ser alterado. Esta conta possui ${hasEntries[0].count} lançamentos contábeis.`,
        code: "CODE_LOCKED",
        suggestion: "Você pode editar o nome, descrição ou status, mas não o código.",
        lockReason: "Integridade de auditoria (NBC TG 26)"
      }, { status: 400 });
    }
  }
  
  // ✅ Permite editar apenas campos permitidos
  await db.execute(sql`
    UPDATE chart_of_accounts 
    SET 
      name = ${body.name || currentAccount.name},
      description = ${body.description || currentAccount.description},
      status = ${body.status || currentAccount.status},
      accepts_cost_center = ${body.acceptsCostCenter ?? currentAccount.acceptsCostCenter},
      requires_cost_center = ${body.requiresCostCenter ?? currentAccount.requiresCostCenter},
      updated_at = GETDATE(),
      updated_by = ${session.user.id}
    WHERE id = ${parseInt(id)}
  `);
  
  return NextResponse.json({ success: true });
}
```

#### **1.3 Bloquear Lançamento em Conta Sintética**

```typescript
// src/services/accounting-engine.ts

export async function createJournalEntry(data: JournalEntryInput) {
  // ✅ Validar cada linha
  for (const line of data.lines) {
    const account = await db.query.chartOfAccounts.findFirst({
      where: eq(chartOfAccounts.id, line.chartAccountId)
    });
    
    if (!account) {
      throw new Error(`Conta ${line.chartAccountId} não encontrada`);
    }
    
    // ✅ VALIDAÇÃO CRÍTICA
    if (!account.isAnalytical) {
      // Buscar contas analíticas disponíveis
      const analyticalAccounts = await db.query.chartOfAccounts.findMany({
        where: and(
          eq(chartOfAccounts.parentId, account.id),
          eq(chartOfAccounts.isAnalytical, true),
          isNull(chartOfAccounts.deletedAt)
        )
      });
      
      throw new Error(
        `❌ Conta "${account.code} - ${account.name}" é SINTÉTICA.
         
         Lançamentos devem ser feitos nas contas ANALÍTICAS:
         ${analyticalAccounts.map(a => `  • ${a.code} - ${a.name}`).join('\n')}
         
         Regra: NBC TG 26 - Contas sintéticas apenas consolidam.`
      );
    }
  }
  
  // Continua criação do lançamento...
}
```

---

### **FASE 2: CÓDIGOS SIGNIFICATIVOS (MÉDIA) 🟡**

#### **Problema Atual:**

```sql
-- ❌ AURA CORE ATUAL:
id   | code  | name
1    | 4.01  | Despesas com Veículos
2    | 4.02  | Despesas com Pessoal
15   | 4.03  | Combustível  ← ID=15, mas código 4.03 (confuso!)
```

#### **Padrão Totvs/SAP:**

```sql
-- ✅ CÓDIGO = HIERARQUIA
code       | name                    | parent_code
1          | ATIVO                   | null
1.1        | Ativo Circulante        | 1
1.1.01     | Caixa e Bancos          | 1.1
1.1.01.001 | Caixa Matriz            | 1.1.01
1.1.01.002 | Banco Bradesco          | 1.1.01
```

#### **Implementação:**

```typescript
// Migration: alter_chart_accounts_code_hierarchy.sql

-- ✅ Adicionar validação de hierarquia no código
ALTER TABLE chart_of_accounts 
ADD CONSTRAINT CK_code_hierarchy_matches_parent 
CHECK (
  (parent_id IS NULL AND code NOT LIKE '%.%') OR  -- Nível 0: sem ponto
  (parent_id IS NOT NULL AND code LIKE '%.%')      -- Nível 1+: com ponto
);

-- ✅ Função para gerar próximo código
CREATE FUNCTION dbo.fn_next_chart_account_code(@parent_id INT)
RETURNS NVARCHAR(50)
AS
BEGIN
  DECLARE @parent_code NVARCHAR(50);
  DECLARE @max_child_code NVARCHAR(50);
  DECLARE @next_code NVARCHAR(50);
  
  -- Buscar código do pai
  SELECT @parent_code = code FROM chart_of_accounts WHERE id = @parent_id;
  
  -- Buscar último código filho
  SELECT @max_child_code = MAX(code) 
  FROM chart_of_accounts 
  WHERE parent_id = @parent_id;
  
  IF @max_child_code IS NULL
    SET @next_code = @parent_code + '.01';  -- Primeiro filho
  ELSE
  BEGIN
    DECLARE @last_num INT;
    SET @last_num = CAST(RIGHT(@max_child_code, 2) AS INT);
    SET @next_code = @parent_code + '.' + FORMAT(@last_num + 1, '00');
  END
  
  RETURN @next_code;
END;
```

---

### **FASE 3: AUDITORIA DETALHADA (MÉDIA) 🟡**

#### **Padrão Totvs:**

```sql
-- ✅ TOTVS: Tabela de histórico de alterações
CREATE TABLE chart_accounts_audit (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  chart_account_id INT NOT NULL,
  operation NVARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  
  -- Snapshot completo ANTES da mudança
  old_code NVARCHAR(50),
  old_name NVARCHAR(255),
  old_type NVARCHAR(50),
  old_status NVARCHAR(20),
  
  -- Snapshot completo DEPOIS da mudança
  new_code NVARCHAR(50),
  new_name NVARCHAR(255),
  new_type NVARCHAR(50),
  new_status NVARCHAR(20),
  
  -- Metadados
  changed_by NVARCHAR(255) NOT NULL,
  changed_at DATETIME2 DEFAULT GETDATE(),
  reason NVARCHAR(MAX),  -- Justificativa da mudança
  
  FOREIGN KEY (chart_account_id) REFERENCES chart_of_accounts(id)
);

-- ✅ Trigger para popular auditoria
CREATE TRIGGER trg_chart_accounts_audit
ON chart_of_accounts
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
  -- Inserir log de auditoria
  INSERT INTO chart_accounts_audit (...)
  VALUES (...);
END;
```

---

## 📋 COMPARAÇÃO: AURA CORE vs. MERCADO

| **Aspecto** | **Aura Core Atual** | **Totvs** | **SAP** | **Oracle** | **Status** |
|------------|-------------------|----------|---------|-----------|-----------|
| **Hierarquia** | ✅ Sim (parent_id, level) | ✅ Sim | ✅ Sim | ✅ Sim | ✅ OK |
| **Soft Delete** | ✅ Sim (deleted_at) | ✅ Sim | ✅ Sim | ✅ Sim | ✅ OK |
| **Validação ao Excluir** | ❌ Não valida uso | ✅ RESTRICT | ✅ RESTRICT | ✅ RESTRICT | ❌ **CRÍTICO** |
| **Bloqueio de Código** | ❌ Permite editar | ✅ Bloqueia | ✅ Bloqueia | ✅ Bloqueia | ❌ **CRÍTICO** |
| **Conta Sintética** | ❌ Não valida | ✅ Valida | ✅ Valida | ✅ Valida | ❌ **CRÍTICO** |
| **Código Significativo** | 🟡 Parcial | ✅ Sim | ✅ Sim | ✅ Sim | 🟡 **MELHORAR** |
| **Auditoria Detalhada** | 🟡 Básica | ✅ Completa | ✅ Completa | ✅ Completa | 🟡 **MELHORAR** |
| **Multi-tenant** | ✅ Sim | ❌ Não | ❌ Não | ✅ Sim | ✅ **VANTAGEM** |
| **Foreign Keys** | ❌ Sem RESTRICT | ✅ RESTRICT | ✅ RESTRICT | ✅ RESTRICT | ❌ **CRÍTICO** |

---

## 🎯 PLANO DE AÇÃO RECOMENDADO

### **URGENTE (Implementar AGORA) 🔴**

**1. Validação de Exclusão (Plano de Contas)**
- ✅ Validar se tem lançamentos em `journal_entry_lines`
- ✅ Validar se tem contas filhas
- ✅ Retornar erro detalhado (quantos lançamentos, quais filhas)
- ✅ Sugerir desativação ao invés de exclusão
- **Impacto:** Evita perda de rastreabilidade contábil
- **Tempo:** 1h

**2. Validação de Exclusão (Categorias Financeiras)**
- ✅ Validar se usada em `fiscal_document_items`
- ✅ Validar se usada em `accounts_payable`/`accounts_receivable`
- ✅ Retornar erro com contador de uso
- **Impacto:** Evita documentos fiscais órfãos
- **Tempo:** 1h

**3. Validação de Exclusão (Centros de Custo)**
- ✅ Validar se usado em `journal_entry_lines`
- ✅ Validar se usado em `work_orders`/`cargo_documents`
- ✅ Retornar erro detalhado
- **Impacto:** Evita perda de rastreabilidade de custos
- **Tempo:** 1h

**4. Bloqueio de Edição de Código**
- ✅ Bloquear alteração de `code` após 1º lançamento
- ✅ Permitir apenas `name`, `description`, `status`
- ✅ Retornar erro educativo
- **Impacto:** Garante auditoria e compliance
- **Tempo:** 1h

**5. Validação de Conta Sintética**
- ✅ Adicionar validação em `accounting-engine.ts`
- ✅ Verificar `is_analytical = true` antes de lançar
- ✅ Retornar lista de contas analíticas disponíveis
- **Impacto:** Evita duplicação de valores em DRE/Balanço
- **Tempo:** 1h

---

### **IMPORTANTE (Implementar DEPOIS) 🟡**

**6. Códigos Significativos**
- Implementar função `fn_next_chart_account_code()`
- Auto-sugerir código baseado no pai
- **Impacto:** Facilita leitura e organização
- **Tempo:** 2h

**7. Auditoria Detalhada**
- Criar tabela `chart_accounts_audit`
- Trigger para popular automaticamente
- Tela de histórico de alterações
- **Impacto:** Compliance com auditoria externa
- **Tempo:** 3h

**8. Hierarquia em Centros de Custo**
- Adicionar `parent_id`, `level` em `cost_centers`
- Permitir consolidação hierárquica
- **Impacto:** Relatórios gerenciais mais ricos
- **Tempo:** 2h

---

### **OPCIONAL (Nice to Have) 🟢**

**9. Rateio Multi-Centro de Custo**
- Criar tabela `cost_center_allocations`
- Permitir % por CC em um lançamento
- **Tempo:** 4h

**10. Validação de Débito/Crédito**
- Validar balanceamento automático
- **Tempo:** 2h

---

## 📝 RESUMO EXECUTIVO

### **🚨 PROBLEMAS CRÍTICOS (Compliance e Auditoria):**

1. ❌ **Exclusão sem validação** → Permite apagar contas com lançamentos
2. ❌ **Edição de código sem bloqueio** → Quebra auditoria
3. ❌ **Lançamento em conta sintética** → Duplica valores em relatórios

### **💡 RECOMENDAÇÃO:**

**IMPLEMENTAR FASE 1 (Validações de Integridade) URGENTEMENTE**

**Justificativa:**
- 🔴 **Risco Fiscal:** Auditoria Receita Federal pode reprovar
- 🔴 **Risco Contábil:** DRE e Balanço podem estar errados
- 🔴 **Risco Legal:** NBC TG 26 exige rastreabilidade

---

## ✅ APROVAÇÃO NECESSÁRIA

**Qual fase você quer implementar?**

**A)** Fase 1 COMPLETA (5 itens, ~5h) - **RECOMENDADO** 🔴  
**B)** Fase 1 + Fase 2 (8 itens, ~12h) - Completo  
**C)** Apenas item 1 (Validação de Exclusão, ~3h) - Mínimo  
**D)** Deixar para depois (arriscado)

---

**Aguardo sua decisão! Esta é uma decisão crítica para compliance fiscal.** ⚖️



