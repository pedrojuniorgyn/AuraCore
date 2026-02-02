# 🚀 Executar Migrations no Coolify - Fase 6 + Fase 7

**Data:** 2026-02-01  
**Migrations:** 0052, 0053, 0054, 0055  
**Database:** AuraCore (SQL Server)

---

## 📋 Pré-requisitos

- ✅ Acesso ao Coolify Dashboard
- ✅ Projeto AuraCore configurado
- ✅ Container SQL Server rodando
- ✅ Senha SA_PASSWORD configurada

---

## 🎯 Opção 1: Script Consolidado (RECOMENDADO)

### Passo 1: Acessar Terminal do SQL Container

1. Abrir **Coolify Dashboard**
2. Navegar: **AuraCore → Containers → sql-zksk8s0kk08sksgwggkos0gw-***
3. Clicar em **Terminal**

### Passo 2: Conectar ao SQL Server

No terminal do container:

```bash
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}"
```

**Esperado:**
```
1>
```

### Passo 3: Executar Script Consolidado

1. **Abrir o arquivo** `EXECUTE_FASE6_FASE7.sql` no seu editor local
2. **Copiar TODO o conteúdo** (Ctrl+A, Ctrl+C)
3. **Colar no terminal** do sqlcmd (Ctrl+Shift+V ou botão direito)
4. Aguardar execução

**Esperado:**
```
🚀 Iniciando migrations Fase 6 + Fase 7...
📋 Migration 0052: Strategic Alerts...
✅ Tabela strategic_alert criada com sucesso
📋 Migration 0053: Workflow Approval...
✅ Tabela strategic_approval_history criada com sucesso
...
✅ MIGRATIONS CONCLUÍDAS COM SUCESSO!
```

### Passo 4: Validar

Ainda no sqlcmd:

```sql
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME LIKE 'strategic_%' OR TABLE_NAME = 'department'
ORDER BY TABLE_NAME;
GO
```

**Esperado:** Ver as novas tabelas:
- `department`
- `strategic_alert`
- `strategic_approval_history`
- (outras tabelas strategic existentes)

### Passo 5: Sair

```sql
EXIT
```

---

## 🎯 Opção 2: Migrations Individuais

Se preferir executar uma por vez:

### 0052 - Strategic Alerts

```bash
# No terminal do container
cat << 'EOF' | /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}"
USE AuraCore;
GO
-- (colar conteúdo de 0052_add_strategic_alerts.sql)
GO
EOF
```

### 0053 - Workflow Approval

```bash
cat << 'EOF' | /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}"
USE AuraCore;
GO
-- (colar conteúdo de 0053_add_workflow_approval.sql)
GO
EOF
```

### 0054 - Departments

```bash
cat << 'EOF' | /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}"
USE AuraCore;
GO
-- (colar conteúdo de 0054_add_departments.sql)
GO
EOF
```

### 0055 - Migrate Department Data

```bash
cat << 'EOF' | /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}"
USE AuraCore;
GO
-- (colar conteúdo de 0055_migrate_department_data.sql)
GO
EOF
```

---

## 🎯 Opção 3: Azure Data Studio / DBeaver (GUI)

Se preferir usar GUI:

1. **Conectar ao banco:**
   - Host: `sql.seu-coolify.com` (ou IP do container)
   - Port: `1433`
   - User: `sa`
   - Password: `${SA_PASSWORD}`
   - Database: `AuraCore`

2. **Abrir `EXECUTE_FASE6_FASE7.sql`**

3. **Executar** (F5 ou botão Run)

4. **Verificar output** na aba Messages

---

## 🎯 Opção 4: Drizzle Kit (Se configurado)

Se o `drizzle.config.ts` está configurado para produção:

```bash
# No terminal LOCAL (não no Coolify)
cd ~/aura_core

# Aplicar migrations
npx drizzle-kit push:mssql

# Ou via npm script (se existir)
npm run db:migrate:prod
```

---

## ✅ Validação Final

### Query de Validação Completa

```sql
USE AuraCore;
GO

-- 1. Verificar tabelas criadas
SELECT 
    'Tabelas Criadas' as Categoria,
    TABLE_NAME as Nome
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN (
    'strategic_alert',
    'strategic_approval_history',
    'department'
)
ORDER BY TABLE_NAME;
GO

-- 2. Verificar colunas adicionadas
SELECT 
    'Colunas Workflow' as Categoria,
    COLUMN_NAME as Nome,
    DATA_TYPE as Tipo
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'strategic_strategy' 
  AND COLUMN_NAME IN (
      'workflow_status',
      'submitted_by_user_id',
      'submitted_at',
      'rejection_reason'
  );
GO

SELECT 
    'Coluna Department' as Categoria,
    COLUMN_NAME as Nome,
    DATA_TYPE as Tipo
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'strategic_action_plan' 
  AND COLUMN_NAME = 'department_id';
GO

-- 3. Verificar dados populados
SELECT 
    'Action Plans com Department' as Categoria,
    COUNT(*) as Total
FROM strategic_action_plan
WHERE department_id IS NOT NULL
  AND deleted_at IS NULL;
GO

-- 4. Resumo geral
SELECT 
    'Resumo Geral' as Status,
    (SELECT COUNT(*) FROM strategic_alert) as Alerts,
    (SELECT COUNT(*) FROM strategic_approval_history) as ApprovalHistory,
    (SELECT COUNT(*) FROM department) as Departments,
    (SELECT COUNT(*) FROM strategic_action_plan WHERE department_id IS NOT NULL) as ActionPlansWithDept;
GO
```

**Esperado:**
```
Categoria              Nome
--------------------- ---------------------------
Tabelas Criadas       department
Tabelas Criadas       strategic_alert
Tabelas Criadas       strategic_approval_history

Categoria              Nome                  Tipo
--------------------- -------------------- ----------
Colunas Workflow      workflow_status      varchar
Colunas Workflow      submitted_by_user_id int
...

Status        Alerts  ApprovalHistory  Departments  ActionPlansWithDept
----------- -------- --------------- ------------ -------------------
Resumo Geral    0           0             0-X          0-Y
```

---

## ⚠️ Troubleshooting

### Erro: "Cannot find sqlcmd"

```bash
# Localizar sqlcmd no container
find /opt -name sqlcmd

# Usar caminho completo
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}"
```

### Erro: "Login failed for user 'sa'"

```bash
# Verificar senha no Coolify
# Dashboard → AuraCore → Environment Variables → SA_PASSWORD

# Ou usar senha diretamente
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "SuaSenhaAqui"
```

### Erro: "Database 'AuraCore' does not exist"

```sql
-- Criar database (se não existir)
CREATE DATABASE AuraCore;
GO
```

### Erro: "Table already exists"

**Não é um erro!** O script é idempotente:
- ✅ Verifica se tabela existe antes de criar
- ✅ Mostra `⚠️ já existe, pulando...`
- ✅ Seguro rodar múltiplas vezes

### Erro: "Foreign key constraint failed"

Significa que as tabelas referenciadas não existem:

```sql
-- Verificar se organization e branch existem
SELECT * FROM organization;
SELECT * FROM branch;
GO

-- Se não existirem, rodar migrations anteriores primeiro
```

---

## 🔄 Rollback (Emergência)

**⚠️ ATENÇÃO:** Rollback apaga dados!

### Se algo der muito errado:

1. **Abrir `ROLLBACK_FASE6_FASE7.sql`**
2. **Copiar TODO o conteúdo**
3. **Executar no sqlcmd** (mesmo processo da Opção 1)

**Esperado:**
```
⚠️  INICIANDO ROLLBACK...
🔄 Rollback 0055: Limpar department_id...
✅ department_id limpo de action_plan
...
✅ ROLLBACK CONCLUÍDO!
```

---

## 📞 Suporte

### Logs do Container

```bash
# No Coolify Dashboard
# AuraCore → sql-zksk8s0kk08sksgwggkos0gw-* → Logs

# Ou via CLI
docker logs sql-zksk8s0kk08sksgwggkos0gw-* --tail 100
```

### Verificar Conexão

```bash
# No terminal do container
/opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P "${SA_PASSWORD}" -Q "SELECT @@VERSION"
```

**Esperado:** Retornar versão do SQL Server

---

## ✅ Checklist Final

Após executar as migrations, marque:

- [ ] Script `EXECUTE_FASE6_FASE7.sql` executado sem erros
- [ ] Tabela `strategic_alert` criada
- [ ] Tabela `strategic_approval_history` criada
- [ ] Tabela `department` criada
- [ ] Coluna `workflow_status` adicionada em `strategic_strategy`
- [ ] Coluna `department_id` adicionada em `strategic_action_plan`
- [ ] Query de validação executada com sucesso
- [ ] Nenhum erro nos logs do container
- [ ] Aplicação web funcionando normalmente

---

**Criado por:** AgenteAura ⚡  
**Data:** 2026-02-01  
**Fase:** 6 + 7
