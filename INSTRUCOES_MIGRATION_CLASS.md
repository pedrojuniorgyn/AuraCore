# 🔧 INSTRUÇÕES - Migration Coluna `class`

**Data:** 10/12/2025  
**Problema:** Coluna `class` não existe na tabela `cost_centers`  
**Status:** ⚠️ **CORREÇÃO TEMPORÁRIA APLICADA**

---

## 🐛 PROBLEMA IDENTIFICADO

**Erro no terminal:**
```
❌ Erro ao buscar centros de custo: Error [RequestError]: Invalid column name 'class'.
```

**Causa:** O schema TypeScript define a coluna `class` mas ela não existe no banco de dados.

---

## ✅ CORREÇÃO TEMPORÁRIA APLICADA

Comentei o uso da coluna `class` nas APIs:

### **Arquivos Modificados:**
1. `/api/financial/cost-centers/route.ts` (POST)
2. `/api/financial/cost-centers/[id]/route.ts` (PUT)

**Antes:**
```typescript
class: ccClass || "BOTH", // ✅ REVENUE, EXPENSE, BOTH
```

**Depois:**
```typescript
// class: ccClass || "BOTH", // TODO: Adicionar após migration
```

---

## 🔧 SOLUÇÃO DEFINITIVA

### **Opção 1: Executar Migration Existente**

Já existe uma migration criada:
- `drizzle/migrations/0031_fix_cost_centers_class.sql`
- `drizzle/migrations/0032_add_class_to_cost_centers.sql`

**Problema:** A migration 0031 procura por `financial_cost_centers` mas a tabela é `cost_centers`.

### **Opção 2: Executar SQL Direto no Banco**

Execute este SQL no SQL Server Management Studio ou Azure Data Studio:

```sql
-- Verificar se a coluna existe
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('cost_centers') 
    AND name = 'class'
)
BEGIN
    -- Adicionar coluna
    ALTER TABLE cost_centers
    ADD class NVARCHAR(20) DEFAULT 'BOTH';
    
    PRINT 'Coluna class adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Coluna class já existe.';
END;
GO

-- Atualizar registros existentes
UPDATE cost_centers
SET class = 'BOTH'
WHERE class IS NULL;
GO

PRINT 'Migration concluída!';
GO
```

### **Opção 3: Descomentaror Código Após Migration**

Depois de executar a migration, descomentar as linhas:

1. **`/api/financial/cost-centers/route.ts`** linha ~141:
```typescript
class: ccClass || "BOTH", // ✅ REVENUE, EXPENSE, BOTH
```

2. **`/api/financial/cost-centers/[id]/route.ts`** linha ~166:
```typescript
class: ccClass !== undefined ? ccClass : existing[0].class, // ✅ CLASSE
```

---

## 📊 STATUS ATUAL

| Item | Status |
|------|--------|
| **Erro no terminal** | ✅ Corrigido |
| **API funcionando** | ✅ Sem coluna class |
| **Coluna no banco** | ❌ Não existe |
| **Schema TypeScript** | ✅ Definido |
| **Migration criada** | ✅ 0031 e 0032 |
| **Migration executada** | ❌ Pendente |

---

## 🚀 COMO EXECUTAR MIGRATION

### **Via SQL direto (RECOMENDADO):**

1. Abrir Azure Data Studio ou SSMS
2. Conectar no servidor: `vpsw4722.publiccloud.com.br`
3. Selecionar banco: `aura_core`
4. Executar o SQL acima
5. Verificar: `SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('cost_centers') AND name = 'class'`

### **Via script Node (se tiver credenciais):**

```bash
cd /Users/pedrolemes/aura_core
npx tsx run-migration-0032.ts
```

---

## ✅ RESULTADO

**Imediato:**
- ✅ API de centros de custo funcionando
- ✅ Erro no terminal resolvido
- ✅ Sistema compilando

**Após Migration:**
- ✅ Coluna `class` disponível
- ✅ Funcionalidade completa de classificação
- ✅ Receita/Despesa/Ambos implementado

---

## 📝 OBSERVAÇÕES

- A coluna `class` permite classificar centros de custo como:
  - `REVENUE` (Receita)
  - `EXPENSE` (Despesa)
  - `BOTH` (Ambos)

- Isso é útil para:
  - DRE (Demonstração de Resultado)
  - Relatórios gerenciais
  - Análise de custos

---

**🎉 SISTEMA FUNCIONANDO NORMALMENTE MESMO SEM A COLUNA! 🎉**

**TODO:** Executar migration SQL quando tiver acesso ao banco.
















