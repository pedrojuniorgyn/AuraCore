# 🚨 HOTFIX: Executar Migrations Pendentes

## Problema Identificado

O banco de dados de produção está **desatualizado** em relação aos schemas do código. Isso está causando os seguintes erros:

1. ❌ `Invalid column name 'created_by'` em várias tabelas do módulo Strategic
2. ❌ `Invalid object name 'partners'` (deveria ser `business_partners`)
3. ❌ `Invalid object name 'strategic_idea_box'`
4. ❌ Erro Drizzle `.limit is not a function` (causado por minificação do Next.js)

## Correções Aplicadas no Código

### 1. Corrigido `next.config.ts`
```typescript
serverExternalPackages: ["mssql", "bcryptjs", "drizzle-orm"]
```
**Motivo:** Evitar que o Next.js minifique o Drizzle ORM incorretamente.

### 2. Corrigido `/api/dashboard/stats/route.ts`
```typescript
// ANTES: FROM partners
// DEPOIS: FROM business_partners
```
**Motivo:** Nome correto da tabela.

## 🔧 Como Executar as Migrations

### Opção 1: Via Script TypeScript (Recomendado)

```bash
# No servidor de produção ou container Docker
npx tsx scripts/run-migrations.ts
```

### Opção 2: Via SQL Direto

```bash
# Conectar ao SQL Server e executar:
sqlcmd -S sql -U sa -P <senha> -d AuraCore -i migrations/create_all_marathon_tables.sql
```

### Opção 3: Via Docker Exec (Coolify)

```bash
# Conectar ao container web
docker exec -it web-zksk8s0kk08sksgwggkos0gw-<ID> bash

# Dentro do container
npx tsx scripts/run-migrations.ts
```

## 📊 Tabelas que Serão Criadas/Atualizadas

- `strategic_goals` (adiciona coluna `created_by`)
- `strategic_kpis` (adiciona coluna `created_by`)
- `strategic_action_plans` (adiciona coluna `created_by`)
- `strategic_swot` (adiciona coluna `created_by`)
- `strategic_strategies` (adiciona coluna `created_by`)
- `strategic_idea_box` (cria tabela completa)
- `strategic_war_room_meetings` (adiciona coluna `created_by`)
- E outras tabelas do módulo Strategic

## ⚠️ Importante

1. **Backup:** Faça backup do banco ANTES de executar as migrations
2. **Downtime:** As migrations podem levar alguns minutos
3. **Rollback:** Se algo der errado, restaure o backup

## 🔄 Após Executar as Migrations

1. Fazer novo deploy do código (com as correções do `next.config.ts` e `dashboard/stats/route.ts`)
2. Limpar cache do Next.js: `rm -rf .next`
3. Rebuild da aplicação
4. Reiniciar o container

## 📝 Comandos Completos

```bash
# 1. Fazer backup
docker exec sql-zksk8s0kk08sksgwggkos0gw-<ID> \
  sqlcmd -S localhost -U sa -P <senha> -Q \
  "BACKUP DATABASE AuraCore TO DISK='/var/opt/mssql/backup/auracore_backup_$(date +%Y%m%d_%H%M%S).bak'"

# 2. Executar migrations
docker exec web-zksk8s0kk08sksgwggkos0gw-<ID> \
  npx tsx scripts/run-migrations.ts

# 3. Fazer novo deploy (push do código corrigido)
git add .
git commit -m "hotfix: corrigir schemas e drizzle bundling"
git push origin main

# 4. Aguardar deploy automático do Coolify
```

## ✅ Verificação Pós-Migration

Após executar as migrations e fazer o deploy, verificar:

```bash
# Verificar se tabela strategic_idea_box existe
SELECT name FROM sys.tables WHERE name = 'strategic_idea_box';

# Verificar se coluna created_by existe em strategic_goals
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'strategic_goals' AND COLUMN_NAME = 'created_by';

# Verificar se tabela business_partners existe
SELECT name FROM sys.tables WHERE name = 'business_partners';
```

## 🎯 Resultado Esperado

Após as correções:
- ✅ Erro 500 resolvido
- ✅ Dashboard carregando corretamente
- ✅ Módulo Strategic funcionando
- ✅ Drizzle ORM funcionando corretamente
- ✅ Zero erros de schema no console

---

**Data:** 2026-01-22  
**Épico:** HOTFIX-SCHEMA-V1.0  
**Prioridade:** CRÍTICA 🔴
