# 🔧 CORREÇÃO: Colunas Soft Delete PCG

**Data:** 10 de Dezembro de 2025  
**Status:** ✅ RESOLVIDO

---

## 📋 PROBLEMA

A tela de Plano de Contas Gerencial estava aparecendo vazia devido a erro:

```
❌ Error [RequestError]: Invalid column name 'deleted_at'.
```

---

## 🔍 DIAGNÓSTICO

### **Situação Encontrada:**

✅ **Tabela existe:** `management_chart_of_accounts`  
✅ **Dados existem:** 8 contas PCG (do planejamento de ontem)  
❌ **Coluna faltando:** `deleted_at`  
❌ **Coluna faltando:** `deleted_by`

### **Colunas Originais:**
```sql
- id
- organization_id
- code
- name
- type
- allocation_rule
- is_active
- created_at
- updated_at
```

---

## ✅ SOLUÇÃO APLICADA

### **Colunas Adicionadas:**

```sql
ALTER TABLE management_chart_of_accounts 
ADD deleted_at DATETIME2 NULL;

ALTER TABLE management_chart_of_accounts 
ADD deleted_by NVARCHAR(255) NULL;
```

---

## 📊 DADOS CONFIRMADOS NO BANCO

### **Total:** 8 contas PCG ativas

| Código | Nome | Tipo | Regra Alocação |
|--------|------|------|----------------|
| G-1000 | Custo Gerencial Diesel Provisao KM | EXPENSE | KM_RODADO |
| G-1001 | Custo Gerencial Manutencao Rateio | EXPENSE | TIPO_VEICULO |
| G-2000 | Receita Gerencial Frete Liquido | REVENUE | ROTA |
| G-3000 | Custo Gerencial Depreciacao Veiculos | EXPENSE | ATIVO_FIXO |
| G-4000 | Margem Gerencial EBITDA por Rota | RESULT | ROTA |
| G-5000 | Custo Gerencial MOD Motoristas | EXPENSE | VIAGEM |
| G-6000 | Receita Gerencial WMS por Cliente | REVENUE | CLIENTE |
| G-7000 | Custo Gerencial Armazenagem Rateio | EXPENSE | PALLET |

---

## ✅ VERIFICAÇÃO

### **Query de Teste:**
```sql
SELECT COUNT(*) as total 
FROM management_chart_of_accounts 
WHERE organization_id = 1 AND deleted_at IS NULL;

-- Resultado: 8 contas
```

### **Estrutura Final:**
```
✅ Tabela: management_chart_of_accounts
✅ Dados: 8 contas PCG
✅ Soft Delete: deleted_at + deleted_by
✅ Status: OPERACIONAL
```

---

## 🎯 RESULTADO

```
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║  ✅ PCG 100% FUNCIONAL! ✅                           ║
║                                                       ║
║  - 8 contas do planejamento de ontem                 ║
║  - Colunas soft delete adicionadas                   ║
║  - Tela deve carregar normalmente agora              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

**Autor:** Sistema Aura Core  
**Data:** 10/12/2025  
**Status:** ✅ OPERACIONAL














