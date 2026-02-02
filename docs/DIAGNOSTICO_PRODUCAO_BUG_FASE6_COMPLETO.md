# 🔬 DIAGNÓSTICO COMPLETO: BUGS EM PRODUÇÃO - FASE 6
**Data:** 02/02/2026  
**Autor:** AgenteAura (Arquiteto Sênior)  
**Servidor:** tcl.auracore.cloud (5.253.85.46)  
**Escopo:** Análise pós-deploy Fase 6 + Hotfix

---

## 🚨 RESUMO EXECUTIVO

> **Status:** ❌ **FALHA CATASTRÓFICA EM PRODUÇÃO**  
> **Causa Raiz:** Migrations 0042-0055 NUNCA foram aplicadas no servidor  
> **Impacto:** 100% do módulo Strategic inoperante (todos os endpoints retornam 500)

### Tabela de Status - Bugs Identificados

| Bug ID | Descrição | Severidade | Status | Bloqueante |
|--------|-----------|------------|--------|------------|
| **BUG-022** | Coluna `who_type` não existe | 🔴 CRÍTICO | 🆕 NOVO | ✅ SIM |
| **BUG-020** | Coluna `who_email` não existe | 🔴 CRÍTICO | ✅ CORRIGIDO | ✅ SIM |
| **BUG-021** | FKs referenciam tabelas inexistentes | 🟡 MÉDIO | ⚠️ N/A | ❌ NÃO |

### Impacto nos Endpoints

| Endpoint | Erro | Status HTTP | Causa |
|----------|------|-------------|-------|
| `/api/strategic/dashboard/data` | `Invalid column name 'who_type'` | 500 | BUG-022 |
| `/api/strategic/map` | `Internal Server Error` | 500 | BUG-022 |
| `/api/strategic/strategies` | `Internal Server Error` | 500 | BUG-022 |
| `/api/strategic/goals` | `Internal Server Error` | 500 | BUG-022 |
| `/api/strategic/action-plans/kanban` | `Internal Server Error` | 500 | BUG-022 |
| `/api/strategic/action-plans` | `Internal Server Error` | 500 | BUG-022 |

---

## 📊 LINHA DO TEMPO

### Histórico de Events

| Data | Evento | Responsável | Status |
|------|--------|-------------|--------|
| **30/01/2026** | Migration 0042 criada localmente | Claude Code CLI | ✅ Arquivo criado |
| **31/01/2026** | Fase 6 (Tasks 01-06) implementada | Claude Code CLI | ✅ Código OK |
| **01/02/2026** | Fase 6 (Tasks 07-09) concluída | Claude Code CLI | ✅ Código OK |
| **01/02/2026** | Deploy Fase 6 no Coolify | Desenvolvedor | ❌ Migrations NÃO aplicadas |
| **02/02 09:00** | Testes em produção | Usuário | ❌ 100% erro 500 |
| **02/02 12:00** | Hotfix criado (migrations 0056-0057) | AgenteAura | ⚠️ Parcial |
| **02/02 13:36** | Hotfix aplicado | AgenteAura | ⚠️ who_email OK, who_type FALTA |
| **02/02 14:00** | Testes pós-hotfix | Usuário | ❌ AINDA 500 (who_type) |

---

## 1️⃣ BUG-022: COLUNA `who_type` NÃO EXISTE

### 🔍 Evidências

#### Erro no Console do Navegador
```javascript
Failed to load resource: the server responded with a status of 500 () (data, line 0)
Failed to fetch dashboard data: APIResponseError: Invalid column name 'who_type'.
```

#### Erro Repetido em Todos os Endpoints
```
[Error] Failed to load resource: the server responded with a status of 500 () (strategies, line 0)
[Error] Failed to load resource: the server responded with a status of 500 () (goals, line 0)
[Error] Failed to load resource: the server responded with a status of 500 () (kanban, line 0)
[Error] Failed to load resource: the server responded with a status of 500 () (action-plans, line 0)
```

### Schema Correto (já no código)

**Arquivo:** `src/modules/strategic/infrastructure/persistence/schemas/action-plan.schema.ts`

```typescript
export const actionPlanTable = mssqlTable('strategic_action_plan', {
  // ...
  who: varchar('who', { length: 100 }).notNull(), // Nome do responsável (display)
  whoUserId: varchar('who_user_id', { length: 36 }), // ID se for USER interno
  whoType: varchar('who_type', { length: 20 }).default('USER').notNull(), // 'USER' | 'EMAIL' | 'PARTNER' ⬅️ DEFINIDO
  whoEmail: varchar('who_email', { length: 255 }), // Email se whoType = 'EMAIL'
  whoPartnerId: varchar('who_partner_id', { length: 36 }), // ID se whoType = 'PARTNER'
  // ...
});
```

### Migration Existente (NÃO APLICADA)

**Arquivo:** `drizzle/migrations/0042_add_who_type_to_action_plans.sql`

```sql
-- Migration: Add who type fields to action plans
-- Date: 2026-01-30
-- Refs: BUG-014

IF NOT EXISTS (SELECT 1 FROM sys.columns 
               WHERE object_id = OBJECT_ID('strategic_action_plan') 
               AND name = 'who_type')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_type] VARCHAR(20) NOT NULL DEFAULT 'USER';
    PRINT 'Added column: who_type';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns 
               WHERE object_id = OBJECT_ID('strategic_action_plan') 
               AND name = 'who_email')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_email] VARCHAR(255) NULL;
    PRINT 'Added column: who_email';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns 
               WHERE object_id = OBJECT_ID('strategic_action_plan') 
               AND name = 'who_partner_id')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_partner_id] VARCHAR(36) NULL;
    PRINT 'Added column: who_partner_id';
END
GO
```

### Estado Atual no Banco (Produção)

**Resultado do hotfix 0056 (aplicado em 02/02 13:36):**

```
✅ Coluna who_email adicionada
✅ Índice idx_action_plan_who_email criado
❌ Coluna who_type NÃO EXISTE
❌ Coluna who_partner_id NÃO EXISTE
```

### Causa Raiz

1. **Migration 0042 criada localmente** mas NUNCA aplicada no servidor
2. **Deploy Coolify** não executou migrations pendentes (0042-0055)
3. **Hotfix 0056** tentou adicionar apenas `who_email` (duplicando a 0042)
4. **who_type** ficou esquecido no hotfix

---

## 2️⃣ BUG-020: COLUNA `who_email` NÃO EXISTIA

### Status: ✅ **CORRIGIDO**

**Aplicado via hotfix 0056 em 02/02/2026 às 13:36 BRT**

#### Validação
```sql
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'strategic_action_plan' AND COLUMN_NAME = 'who_email'

-- Resultado:
-- who_email | varchar | 255
```

---

## 3️⃣ BUG-021: FOREIGN KEYS INVÁLIDAS

### Status: ⚠️ **NÃO APLICÁVEL**

**Motivo:** As tabelas referenciadas NÃO EXISTEM no banco de produção.

#### Tentativa de Criar FKs (Falhou)
```
⚠️ FK fk_approval_history_org: Foreign key references invalid table 'organization'.
⚠️ FK fk_approval_delegate_org: Cannot find object "strategic_approval_delegate"
⚠️ FK FK_department_organization: Cannot find object "department"
```

#### Tabelas Faltantes

| Tabela | Migration | Status |
|--------|-----------|--------|
| `strategic_approval_history` | 0053 | ❌ NÃO APLICADA |
| `strategic_approval_delegate` | 0053 | ❌ NÃO APLICADA |
| `departments` | 0054 | ❌ NÃO APLICADA |

#### Nomenclatura de Tabelas

**Memória anterior estava CORRETA:**
- Tabelas legadas: `organizations` (plural), `branches` (plural)
- Problema: Novas tabelas tentando referenciar `organization` (singular)

---

## 4️⃣ ANÁLISE DE CAUSA RAIZ (5 WHYS)

### Por que o módulo Strategic está 100% inoperante?
↪️ Porque todos os endpoints retornam erro 500 "Invalid column name 'who_type'"

### Por que a coluna `who_type` não existe?
↪️ Porque a migration 0042 que cria essa coluna nunca foi aplicada

### Por que a migration 0042 não foi aplicada?
↪️ Porque o deploy no Coolify não executou as migrations pendentes (0042-0055)

### Por que o deploy não executou as migrations?
↪️ Porque não há processo automatizado de migration no pipeline de deploy

### Por que não há processo automatizado?
↪️ Porque as migrations são aplicadas manualmente via SSH (processo ad-hoc)

---

## 5️⃣ GAPS: MIGRATIONS NÃO APLICADAS

### Migrations Pendentes (Estimativa)

| # | Migration | Descrição | Impacto | Prioridade |
|---|-----------|-----------|---------|------------|
| 0042 | `add_who_type_to_action_plans` | who_type, who_email, who_partner_id | 🔴 CRÍTICO | P0 |
| 0043 | `align_control_item_schema` | Ajustes control_item | 🟡 MÉDIO | P2 |
| 0044 | `create_verification_item` | Tabela verification_item | 🟡 MÉDIO | P2 |
| 0045 | `create_anomaly` | Tabela anomaly | 🟡 MÉDIO | P2 |
| 0046 | `create_strategic_views` | Views analíticas | 🟢 BAIXO | P3 |
| 0047 | `add_kpi_value_versions` | Versionamento KPI | 🟡 MÉDIO | P2 |
| 0048 | `add_strategy_version` | Versionamento estratégia | 🟡 MÉDIO | P2 |
| 0049 | `create_strategic_anomaly` | Tabela strategic_anomaly | 🟡 MÉDIO | P2 |
| 0050 | `update_control_items_view` | Ajustes views | 🟢 BAIXO | P3 |
| 0051 | `create_alert_log` | Log de alertas | 🟡 MÉDIO | P2 |
| 0052 | `add_strategic_alerts` | Tabela strategic_alert | 🔴 ALTO | P1 |
| 0053 | `add_workflow_approval` | Workflow aprovação (2 tabelas) | 🔴 ALTO | P1 |
| 0054 | `add_departments` | Tabela departments | 🔴 ALTO | P1 |
| 0055 | `migrate_department_data` | Migração de dados | 🔴 ALTO | P1 |

### Totais
- **Migrations não aplicadas:** 14
- **Críticas (P0):** 1 (0042)
- **Altas (P1):** 4 (0052-0055)
- **Médias (P2):** 7
- **Baixas (P3):** 2

---

## 6️⃣ PLANO DE CORREÇÃO

### Fase 1: HOTFIX EMERGENCIAL (AGORA) ⚡

**Objetivo:** Fazer o módulo Strategic funcionar novamente

#### Ação 1.1: Aplicar Migration 0042 Completa

**Script SQL:**
```sql
-- ===================================================================
-- HOTFIX CRÍTICO: BUG-022 - Adicionar who_type e who_partner_id
-- Data: 02/02/2026
-- Refs: Migration 0042 (nunca aplicada)
-- ===================================================================

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '=== INICIANDO HOTFIX BUG-022 ===';
GO

-- 1. Adicionar who_type (CRÍTICO)
IF NOT EXISTS (SELECT 1 FROM sys.columns 
               WHERE object_id = OBJECT_ID('strategic_action_plan') 
               AND name = 'who_type')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_type] VARCHAR(20) NOT NULL DEFAULT 'USER';
    PRINT '✅ Coluna who_type adicionada';
END
ELSE
BEGIN
    PRINT '⚠️ Coluna who_type já existe';
END
GO

-- 2. Adicionar who_partner_id
IF NOT EXISTS (SELECT 1 FROM sys.columns 
               WHERE object_id = OBJECT_ID('strategic_action_plan') 
               AND name = 'who_partner_id')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_partner_id] VARCHAR(36) NULL;
    PRINT '✅ Coluna who_partner_id adicionada';
END
ELSE
BEGIN
    PRINT '⚠️ Coluna who_partner_id já existe';
END
GO

-- 3. Alterar who_user_id para NULL (retrocompatibilidade)
IF EXISTS (SELECT 1 FROM sys.columns 
           WHERE object_id = OBJECT_ID('strategic_action_plan') 
           AND name = 'who_user_id' 
           AND is_nullable = 0)
BEGIN
    ALTER TABLE [strategic_action_plan]
    ALTER COLUMN [who_user_id] VARCHAR(36) NULL;
    PRINT '✅ Coluna who_user_id agora permite NULL';
END
ELSE
BEGIN
    PRINT '⚠️ Coluna who_user_id já é nullable';
END
GO

-- 4. Criar índice who_type (performance)
IF NOT EXISTS (SELECT 1 FROM sys.indexes 
               WHERE name = 'idx_action_plan_who_type' 
               AND object_id = OBJECT_ID('strategic_action_plan'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_action_plan_who_type
    ON [strategic_action_plan](who_type)
    WHERE who_type IS NOT NULL AND deleted_at IS NULL;
    PRINT '✅ Índice idx_action_plan_who_type criado';
END
ELSE
BEGIN
    PRINT '⚠️ Índice idx_action_plan_who_type já existe';
END
GO

-- 5. Validação final
SELECT 
    'strategic_action_plan' AS tabela,
    COLUMN_NAME AS coluna,
    DATA_TYPE AS tipo,
    CHARACTER_MAXIMUM_LENGTH AS tamanho,
    IS_NULLABLE AS nullable,
    COLUMN_DEFAULT AS default_value
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'strategic_action_plan'
AND COLUMN_NAME IN ('who', 'who_type', 'who_user_id', 'who_email', 'who_partner_id')
ORDER BY ORDINAL_POSITION;
GO

PRINT '=== HOTFIX BUG-022 CONCLUÍDO ===';
GO
```

#### Ação 1.2: Script de Aplicação via Node.js

**Arquivo:** `scripts/hotfix-bug-022-who-type.js`

```javascript
const mssql = require('mssql');
const fs = require('fs');

const config = {
  server: process.env.DB_HOST || 'sql',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'AuraCore',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false'
  }
};

(async () => {
  console.log('🚨 HOTFIX BUG-022: Aplicando correção who_type...\n');
  
  const pool = await mssql.connect(config);
  
  // Executar script SQL completo
  const sqlScript = fs.readFileSync('./hotfix-bug-022.sql', 'utf8');
  const batches = sqlScript.split(/\bGO\b/);
  
  for (const batch of batches) {
    if (batch.trim()) {
      await pool.request().query(batch);
    }
  }
  
  // Validação
  const validation = await pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'strategic_action_plan'
    AND COLUMN_NAME IN ('who_type', 'who_partner_id')
  `);
  
  console.log('\n✅ Validação:');
  validation.recordset.forEach(col => {
    console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
  });
  
  await pool.close();
  console.log('\n🎉 HOTFIX APLICADO COM SUCESSO!');
})().catch(console.error);
```

#### Ação 1.3: Comando de Aplicação no Servidor

```bash
# No servidor via SSH
ssh root@5.253.85.46

# Criar arquivo SQL temporário
cat > /tmp/hotfix-bug-022.sql << 'ENDSQL'
[COLAR CONTEÚDO DO SCRIPT SQL ACIMA]
ENDSQL

# Executar via container
WEB_CONTAINER=$(docker ps --format '{{.Names}}' | grep "^web-")

docker exec -i $WEB_CONTAINER node -e "
const mssql = require('mssql');
const fs = require('fs');
const config = {
  server: 'sql',
  user: 'sa',
  password: process.env.DB_PASSWORD,
  database: 'AuraCore',
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  const pool = await mssql.connect(config);
  const script = \`[COLAR SCRIPT SQL INLINE]\`;
  const batches = script.split(/\\bGO\\b/);
  for (const batch of batches) {
    if (batch.trim()) await pool.request().query(batch);
  }
  await pool.close();
  console.log('✅ HOTFIX BUG-022 APLICADO!');
})();
"

# Testar endpoint
curl -s https://tcl.auracore.cloud/api/strategic/dashboard/data | jq .
```

### Fase 2: MIGRATIONS PENDENTES (DIA SEGUINTE) 📦

**Objetivo:** Aplicar todas as migrations da Fase 6 + Fase 7

#### Ação 2.1: Criar Migration Consolidada

**Opção A: Aplicar Individualmente (0042-0055)**
```bash
# Executar cada migration na ordem
for migration in 0042 0043 0044 0045 0046 0047 0048 0049 0050 0051 0052 0053 0054 0055; do
  echo "Aplicando $migration..."
  docker exec -i $WEB_CONTAINER node -e "..." < migrations/$migration*.sql
done
```

**Opção B: Consolidar em Uma Única Migration** (RECOMENDADO)
```sql
-- migrations/0058_consolidate_fase6_fase7.sql
-- Aplica TODAS as mudanças pendentes de uma vez
-- Gerado automaticamente a partir de 0042-0055
```

#### Ação 2.2: Script de Validação Pós-Migration

```bash
#!/bin/bash
# scripts/validate-fase6-complete.sh

echo "🔍 Validando Fase 6 + Fase 7..."

# Verificar colunas strategic_action_plan
echo "1. Verificando strategic_action_plan..."
docker exec $WEB_CONTAINER node -e "..." | grep -E "(who_type|who_email|who_partner_id)" || echo "❌ Colunas faltando"

# Verificar tabelas novas
for table in strategic_approval_history strategic_approval_delegate departments; do
  echo "2. Verificando tabela $table..."
  docker exec $WEB_CONTAINER node -e "..." | grep "$table" || echo "❌ Tabela $table não existe"
done

# Testar endpoints
echo "3. Testando endpoints..."
for endpoint in dashboard/data map strategies goals action-plans/kanban; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://tcl.auracore.cloud/api/strategic/$endpoint)
  if [ "$STATUS" = "200" ]; then
    echo "  ✅ /$endpoint"
  else
    echo "  ❌ /$endpoint (HTTP $STATUS)"
  fi
done
```

### Fase 3: PROCESSO DE DEPLOY (PREVENÇÃO) 🛡️

**Objetivo:** Evitar que isso aconteça novamente

#### Ação 3.1: Adicionar Step de Migrations no CI/CD

**Arquivo:** `.github/workflows/deploy-production.yml` (ou Coolify config)

```yaml
# Adicionar step ANTES do deploy
- name: Run Migrations
  run: |
    ssh $SSH_TARGET "
      cd /app
      docker exec \$WEB_CONTAINER npm run db:migrate
    "

# Validar migrations aplicadas
- name: Validate Migrations
  run: |
    ssh $SSH_TARGET "
      docker exec \$WEB_CONTAINER node -e '
        require(\"./scripts/validate-migrations.js\")()
      '
    "
```

#### Ação 3.2: Script de Checklist Pré-Deploy

```bash
#!/bin/bash
# scripts/pre-deploy-checklist.sh

echo "📋 PRÉ-DEPLOY CHECKLIST"
echo "======================="

# 1. Verificar migrations pendentes
PENDING=$(drizzle-kit check | grep "pending")
if [ -n "$PENDING" ]; then
  echo "⚠️ ATENÇÃO: Migrations pendentes detectadas!"
  echo "$PENDING"
  read -p "Deseja continuar? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deploy cancelado"
    exit 1
  fi
fi

# 2. Testar migrations localmente
echo "🧪 Testando migrations em banco local..."
npm run db:migrate:test || {
  echo "❌ Migrations falharam em teste local!"
  exit 1
}

# 3. Comparar schemas local vs produção
echo "🔍 Comparando schemas..."
npm run db:compare:production || {
  echo "⚠️ Diferenças detectadas entre local e produção"
}

echo "✅ Checklist concluído!"
```

---

## 7️⃣ LIÇÕES APRENDIDAS

### ❌ O Que Deu Errado

| # | Problema | Impacto |
|---|----------|---------|
| 1 | **Migrations não aplicadas no deploy** | Código espera schema novo, banco tem schema antigo |
| 2 | **Hotfix incompleto (0056)** | Corrigiu apenas who_email, esqueceu who_type |
| 3 | **Falta de validação pós-deploy** | Bugs só descobertos pelo usuário final |
| 4 | **Deploy manual (sem CI/CD)** | Passo de migrations foi esquecido |
| 5 | **Testes apenas em dev** | Produção tem estado diferente de desenvolvimento |

### ✅ Melhorias Necessárias

| # | Melhoria | Benefício |
|---|----------|-----------|
| 1 | **Automatizar migrations no deploy** | Garante schema sincronizado |
| 2 | **Validação automática pós-deploy** | Detecta erros antes do usuário |
| 3 | **Smoke tests em produção** | Valida endpoints críticos |
| 4 | **Migration rollback** | Permite reverter em caso de falha |
| 5 | **Schema diff tool** | Compara local vs produção |

---

## 8️⃣ PRÓXIMOS PASSOS IMEDIATOS

### ✅ TO-DO (Ordem de Execução)

- [ ] **AGORA:** Aplicar hotfix BUG-022 (who_type + who_partner_id)
- [ ] **AGORA:** Testar todos os endpoints Strategic
- [ ] **AGORA:** Validar dados existentes não corrompidos
- [ ] **HOJE:** Documentar estado do banco pós-hotfix
- [ ] **AMANHÃ:** Aplicar migrations 0043-0055 (consolidadas)
- [ ] **AMANHÃ:** Validar funcionalidades completas Fase 6+7
- [ ] **PRÓXIMA SEMANA:** Implementar CI/CD com migrations automáticas
- [ ] **PRÓXIMA SEMANA:** Criar processo de validação pré/pós-deploy

---

## 📚 REFERÊNCIAS

### Documentos Relacionados
- `docs/HOTFIX-FASE6-DIRECT-SERVER.md` - Hotfix anterior (BUG-020)
- `docs/HOTFIX-FASE6-RUNBOOK.md` - Runbook de aplicação
- `docs/fase6-bugs-analysis.md` - Análise de bugs Fase 6
- `drizzle/migrations/0042_add_who_type_to_action_plans.sql` - Migration original
- `src/modules/strategic/infrastructure/persistence/schemas/action-plan.schema.ts` - Schema correto

### Logs Analisados
- Logs Collify: `deployment-e8040gow8gsock4ck04ks48c-2026-02-02-12-19-00.txt`
- Logs Web: `web-zksk8s0kk08sksgwggkos0gw-020231074215-logs-2026-02-02-12-19-57.txt`
- Screenshots: 12 capturas de tela com erros (Prints bugs/)

---

**FIM DO DIAGNÓSTICO**

*Este documento segue a metodologia dos diagnósticos anteriores:*
- *DIAGNOSTICO_STRATEGIC_ENTITIES_COMPLETO.md*
- *ANALISE_ARQUITETURAL_ENTERPRISE.md*
- *DIAGNOSTICO_ARQUITETO_SENIOR_AURACORE.md*
- *DIAGNOSTICO_STRATEGIC_GOALS_ULTRA_DETALHADO.md*
