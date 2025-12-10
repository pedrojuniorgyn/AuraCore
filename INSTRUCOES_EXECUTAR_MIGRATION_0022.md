# 🚀 INSTRUÇÕES: Executar Migration 0022

## ⚠️ IMPORTANTE

A **Migration 0022** cria as estruturas da **Fase 2** (Melhorias Avançadas).  
Ela PRECISA ser executada antes de usar as novas funcionalidades.

---

## 📋 O QUE A MIGRATION FAZ

✅ Cria função SQL `dbo.fn_next_chart_account_code()`  
✅ Cria tabela `chart_accounts_audit`  
✅ Cria tabela `financial_categories_audit`  
✅ Cria tabela `cost_centers_audit`  
✅ Cria tabela `cost_center_allocations`  
✅ Adiciona campo `class` em `financial_cost_centers`  

---

## 🔧 OPÇÃO 1: Executar via SQL Manual (RECOMENDADO)

### **Passo 1: Copiar SQL**
Abra o arquivo:
```
drizzle/migrations/0022_advanced_improvements.sql
```

### **Passo 2: Executar no SQL Server Management Studio (SSMS)**
1. Abra SSMS  
2. Conecte ao banco `aura_core`  
3. Cole todo o conteúdo do arquivo  
4. Execute (F5)  

### **Passo 3: Verificar Sucesso**
Você deve ver:
```
✅ Função fn_next_chart_account_code criada
✅ Tabela chart_accounts_audit criada
✅ Tabela financial_categories_audit criada
✅ Tabela cost_centers_audit criada
✅ Tabela cost_center_allocations criada
✅ Coluna class adicionada em financial_cost_centers

📊 MIGRATION 0022 CONCLUÍDA
```

---

## 🌐 OPÇÃO 2: Executar via API Next.js (Alternativa)

### **Passo 1: Iniciar Servidor**
```bash
npm run dev
```

### **Passo 2: Fazer Login no Aura Core**
Acesse `http://localhost:3000` e faça login.

### **Passo 3: Executar API**
Abra o Console do navegador (F12) e execute:
```javascript
fetch('/api/admin/run-migration-022', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

### **Passo 4: Verificar Resposta**
Você deve ver:
```json
{
  "success": true,
  "message": "Migration 0022 executada com sucesso!",
  "changes": [
    "✅ Função fn_next_chart_account_code",
    "✅ Tabela chart_accounts_audit",
    "✅ Tabela financial_categories_audit",
    "✅ Tabela cost_centers_audit",
    "✅ Tabela cost_center_allocations",
    "✅ Campo financial_cost_centers.class"
  ]
}
```

---

## ✅ VERIFICAÇÃO PÓS-MIGRATION

Execute estas queries no SSMS para confirmar:

### **1. Verificar Função:**
```sql
SELECT OBJECT_ID('dbo.fn_next_chart_account_code', 'FN');
-- Deve retornar um número (não NULL)
```

### **2. Verificar Tabelas:**
```sql
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN (
  'chart_accounts_audit',
  'financial_categories_audit',
  'cost_centers_audit',
  'cost_center_allocations'
);
-- Deve retornar 4 linhas
```

### **3. Verificar Campo `class`:**
```sql
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'financial_cost_centers' 
  AND COLUMN_NAME = 'class';
-- Deve retornar 'class'
```

---

## 🐛 TROUBLESHOOTING

### **Erro: "Invalid object name 'chart_accounts_audit'"**
**Causa:** Migration não foi executada.  
**Solução:** Execute a Opção 1 ou 2 acima.

### **Erro: "There is already an object named 'chart_accounts_audit'"**
**Causa:** Migration já foi executada.  
**Solução:** Nada a fazer, estruturas já existem!

### **Erro: "Connection is closed"**
**Causa:** Banco de dados não está ativo.  
**Solução:** Inicie o SQL Server e tente novamente.

---

## 📞 SUPORTE

Se encontrar algum erro, verifique:
1. ✅ SQL Server está rodando?  
2. ✅ Banco `aura_core` existe?  
3. ✅ Você tem permissões de `CREATE TABLE` e `CREATE FUNCTION`?  

---

**Última Atualização:** 10/12/2024  
**Versão:** 1.0.0  




