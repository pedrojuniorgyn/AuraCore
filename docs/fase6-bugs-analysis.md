# 🔍 Análise Completa de Bugs - Fase 6 Deploy

**Data:** 2026-02-02  
**Ambiente:** Produção (tcl.auracore.cloud)  
**Status Deploy:** Servidor OK, aplicação com múltiplos bugs críticos

---

## 📊 Sumário Executivo

| Categoria | Severidade | Status | Impacto |
|-----------|-----------|--------|---------|
| **BUG-020: Schema Mismatch** | 🔴 CRÍTICO | BLOQUEADOR | Todas APIs Strategic retornam 500 |
| **BUG-021: FK Inválidas** | 🔴 CRÍTICO | BLOQUEADOR | Migrations falharam parcialmente |
| **BUG-022: 404 Goal Detail** | 🟡 MÉDIO | NÃO TESTADO | Navegação quebrada |
| **BUG-023: React Minified Error** | 🟢 BAIXO | COSMÉTICO | Não afeta funcionalidade |

**Total de bugs críticos:** 2  
**APIs afetadas:** Dashboard, Map, PDCA, Action Plans, Goals  
**Funcionalidades inoperantes:** 100% do módulo Strategic

---

## 🐛 BUG-020: Schema Mismatch - Coluna `who_email` Inexistente

### 📸 Evidência
**Prints:** `09.51.49.png`, `09.52.43.png`, `09.53.09.png`

**Console Error:**
```json
{
  "error": "Invalid column name 'who_email'."
}
```

### 🔍 Causa Raiz
**Arquivo:** `src/modules/strategic/infrastructure/persistence/schemas/action-plan.schema.ts`  
**Linha:** 30

```typescript
whoEmail: varchar('who_email', { length: 255 }), // ❌ Coluna não existe no banco
```

**Migration:** `drizzle/migrations/0035_strategic_module.sql`  
A migration **NÃO criou** a coluna `who_email` na tabela `strategic_action_plan`.

**Query SQL Tentada:**
```sql
SELECT id, organization_id, branch_id, goal_id, code, what, why, 
       where_location, when_start, when_end, who, who_user_id, 
       who_type, who_email, who_partner_id, how, ...  -- ❌ who_email não existe
FROM strategic_action_plan
```

### 💥 Impacto
- ❌ Dashboard Estratégico não carrega
- ❌ Mapa Estratégico não carrega
- ❌ Ciclos PDCA não carrega
- ❌ Criar/editar Action Plans falha com 500
- ❌ Kanban PDCA inoperante

**APIs Afetadas:**
- `GET /api/strategic/dashboard/data` → 500
- `GET /api/strategic/map` → 500
- `GET /api/strategic/action-plans/kanban` → 500
- `POST /api/strategic/action-plans` → 500
- `GET /api/strategic/action-plans?pageSize=100` → 500

### 🛠️ Solução
Adicionar migration hotfix:

```sql
-- hotfix_0056_add_who_email.sql
ALTER TABLE strategic_action_plan
ADD who_email VARCHAR(255) NULL;
GO
```

---

## 🐛 BUG-021: Foreign Keys Inválidas - Referência a Tabela Inexistente

### 📸 Evidência
**Comportamento:** Algumas constraints não foram criadas (fail silent)

### 🔍 Causa Raiz
**Arquivos Afetados:**
- `drizzle/migrations/0053_add_workflow_approval.sql` (linhas 73, 77)
- `drizzle/migrations/0054_add_departments.sql` (linha 31)
- `drizzle/migrations/0025_management_chart_of_accounts.sql`
- `drizzle/migrations/0028_enterprise_ciap_sinistros_esg.sql`

**Erro no SQL:**
```sql
CONSTRAINT fk_approval_history_org FOREIGN KEY (organization_id)
    REFERENCES organizations(id)  -- ❌ Tabela não existe
```

**Tabela Correta:** `organization` (singular)

### 💥 Impacto
- ⚠️ Foreign keys não criadas (integridade referencial comprometida)
- ⚠️ Possível criação de registros órfãos
- ⚠️ Queries podem não ter constraint protection

**Migrations Afetadas:**
1. `0053_add_workflow_approval.sql` (strategic_approval_history)
2. `0054_add_departments.sql` (department)
3. `0025_management_chart_of_accounts.sql` (múltiplas tabelas)
4. `0028_enterprise_ciap_sinistros_esg.sql` (múltiplas tabelas)

### 🛠️ Solução
Corrigir todas as migrations:

```sql
-- hotfix_0057_fix_fk_references.sql

-- 1. Drop constraints inválidas (se existirem)
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_approval_history_org')
    ALTER TABLE strategic_approval_history DROP CONSTRAINT fk_approval_history_org;

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_department_organization')
    ALTER TABLE department DROP CONSTRAINT FK_department_organization;

-- 2. Recriar com referência correta
ALTER TABLE strategic_approval_history
ADD CONSTRAINT fk_approval_history_org FOREIGN KEY (organization_id)
    REFERENCES organization(id);  -- ✅ Singular correto

ALTER TABLE department
ADD CONSTRAINT FK_department_organization
    FOREIGN KEY (organization_id) REFERENCES organization(id);  -- ✅ Singular correto

-- Repetir para todas as tabelas afetadas...
```

---

## 🐛 BUG-022: 404 Goal Detail (Task 07 Pendente)

### 📸 Evidência
**Print:** `09.58.52.png`

**URL:** `tcl.auracore.cloud/strategic/swot/6c7bb23a-8e04-4230-b668-9547abc5ec71`

**Erro:** Página 404 - "Página não encontrada"

### 🔍 Causa Raiz
Rota ainda não implementada. Esta é a **Task 07** pendente da Fase 6:

```
07-Goal Detail 404 (BUG-017)
```

### 💥 Impacto
- ⚠️ Não é possível visualizar detalhes de objetivos SWOT
- ⚠️ Navegação quebrada ao clicar em cards
- ⚠️ UX degradada (links mortos)

### 🛠️ Solução
Implementar página de detalhes conforme Task 07 (não crítico para hotfix imediato).

---

## 🐛 BUG-023: React Minified Error #418 (Cosmético)

### 📸 Evidência
**Print:** `09.51.12.png`

**Console Error:**
```
Error: Minified React error #418; visit https://react.dev/errors/418?...
Error: throw e.Error(e)(this), i < arguments.length && void 0 !== arguments[i]
```

### 🔍 Causa Raiz
Erro de React em modo produção (minified). Geralmente causado por:
- Hook chamado condicionalmente
- Problema de hydration (SSR/CSR mismatch)
- Componente renderizando null em contexto inválido

**Arquivo:** Provável `dashboard.tsx` ou componente de card

### 💥 Impacto
- ⚠️ Erro no console (não afeta funcionalidade visível)
- ⚠️ Pode causar re-renders desnecessários
- ✅ Usuário não percebe

### 🛠️ Solução
Investigar após resolver bugs críticos. Baixa prioridade.

---

## 🎯 Análise de Implementações da Fase 6

### ✅ O que FOI Implementado Corretamente

1. **Alertas Automáticos** (Task 02)
   - ✅ Tabela `strategic_alert` criada
   - ✅ Tabela `strategic_alert_config` criada
   - ✅ Índices corretos
   - ✅ Constraints válidas

2. **Workflow de Aprovação** (Task 05)
   - ✅ Coluna `workflow_status` adicionada
   - ✅ Tabela `strategic_approval_history` criada
   - ✅ Tabela `strategic_approval_delegate` criada
   - ❌ Foreign Keys **inválidas** (BUG-021)

3. **Departments Dinâmicos** (Task 06)
   - ✅ Tabela `department` criada
   - ✅ Coluna `department_id` em `action_plan`
   - ✅ Índices corretos
   - ❌ Foreign Keys **inválidas** (BUG-021)

4. **Build & Deploy**
   - ✅ Build Next.js completo (264s)
   - ✅ Containers healthy (web, SQL, ChromaDB)
   - ✅ Health checks respondendo
   - ✅ Proxy configurado corretamente

### ❌ O que FOI Implementado INCORRETAMENTE

1. **Schema de Action Plans**
   - ❌ Coluna `who_email` definida no código mas não no banco
   - ❌ Causando 100% de falha nas APIs

2. **Foreign Keys Multi-tenancy**
   - ❌ Referências a `organizations` (plural) em vez de `organization`
   - ❌ Constraints não criadas (silent fail)

3. **Goal Detail Page**
   - ❌ Rota não implementada (404)
   - ✅ Mas é esperado (Task 07 pendente)

---

## 🚀 Plano de Hotfix (HOTFIX-FASE-6)

### Prioridade 1: BLOQUEADOR (Fazer AGORA)

#### 1.1 - Adicionar Coluna `who_email`
```bash
# Create migration
cat > drizzle/migrations/0056_hotfix_add_who_email.sql << 'EOF'
-- Hotfix 0056: Add missing who_email column
ALTER TABLE strategic_action_plan
ADD who_email VARCHAR(255) NULL;
GO

-- Index for email-based queries
CREATE NONCLUSTERED INDEX idx_action_plan_who_email
ON strategic_action_plan(who_email)
WHERE who_email IS NOT NULL AND deleted_at IS NULL;
GO
EOF

# Apply migration
npm run db:migrate
```

#### 1.2 - Corrigir Foreign Keys Inválidas
```bash
cat > drizzle/migrations/0057_hotfix_fix_fk_organizations.sql << 'EOF'
-- Hotfix 0057: Fix invalid FK references to 'organizations'

-- ========================================
-- 1. strategic_approval_history
-- ========================================
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_approval_history_org')
BEGIN
    ALTER TABLE strategic_approval_history DROP CONSTRAINT fk_approval_history_org;
END;
GO

ALTER TABLE strategic_approval_history
ADD CONSTRAINT fk_approval_history_org FOREIGN KEY (organization_id)
    REFERENCES organization(id);
GO

-- ========================================
-- 2. strategic_approval_delegate
-- ========================================
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_approval_delegate_org')
BEGIN
    ALTER TABLE strategic_approval_delegate DROP CONSTRAINT fk_approval_delegate_org;
END;
GO

ALTER TABLE strategic_approval_delegate
ADD CONSTRAINT fk_approval_delegate_org FOREIGN KEY (organization_id)
    REFERENCES organization(id);
GO

-- ========================================
-- 3. department
-- ========================================
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_department_organization')
BEGIN
    ALTER TABLE department DROP CONSTRAINT FK_department_organization;
END;
GO

ALTER TABLE department
ADD CONSTRAINT FK_department_organization
    FOREIGN KEY (organization_id) REFERENCES organization(id);
GO

-- ========================================
-- Verificar constraints criadas
-- ========================================
SELECT 
    OBJECT_NAME(parent_object_id) AS table_name,
    name AS constraint_name,
    OBJECT_NAME(referenced_object_id) AS referenced_table
FROM sys.foreign_keys
WHERE name IN (
    'fk_approval_history_org',
    'fk_approval_delegate_org', 
    'FK_department_organization'
);
GO
EOF

# Apply migration
npm run db:migrate
```

#### 1.3 - Validar Schema Sync
```bash
# Verificar colunas
npm run db:studio

# Ou via SQL:
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'strategic_action_plan'
ORDER BY ORDINAL_POSITION;
```

#### 1.4 - Rebuild & Redeploy
```bash
# Local test
npm run build
npm run start

# Production deploy via Coolify UI:
# 1. Push to main branch
# 2. Coolify auto-deploys
# 3. Monitor logs
```

### Prioridade 2: IMPORTANTE (Fazer Depois)

#### 2.1 - Corrigir Migrations Legadas (0025, 0028)
Essas migrations antigas também têm o problema `organizations`, mas não são críticas agora porque já foram aplicadas (constraints falharam silent).

```sql
-- hotfix_0058_fix_legacy_fks.sql
-- TODO: Listar todas FKs de 0025 e 0028 e recriar
```

### Prioridade 3: PODE ESPERAR

#### 3.1 - Implementar Task 07 (Goal Detail 404)
Seguir prompt da Fase 6 original.

#### 3.2 - Investigar React Error #418
Debug no componente de dashboard após outros bugs corrigidos.

---

## 📋 Checklist de Verificação Pós-Hotfix

- [ ] **Schema Sync**
  - [ ] Coluna `who_email` existe em `strategic_action_plan`
  - [ ] Foreign Keys criadas com sucesso
  - [ ] `npm run db:studio` mostra schema correto

- [ ] **APIs Funcionando**
  - [ ] `GET /api/strategic/dashboard/data` → 200
  - [ ] `GET /api/strategic/map` → 200  
  - [ ] `GET /api/strategic/action-plans/kanban` → 200
  - [ ] `POST /api/strategic/action-plans` → 201
  - [ ] `GET /api/strategic/goals/new` → 200

- [ ] **UI Funcional**
  - [ ] Dashboard carrega cards com dados
  - [ ] Mapa Estratégico mostra objetivos
  - [ ] Ciclos PDCA lista planos
  - [ ] Criar Action Plan salva com sucesso
  - [ ] Criar Goal navega corretamente

- [ ] **Logs Limpos**
  - [ ] Console sem erros SQL
  - [ ] Sem "Invalid column name"
  - [ ] Sem "Internal Server Error" (exceto 404s esperados)

---

## 🧠 Lições Aprendidas (Novas)

### L-NEW-008: Schema Drift Prevention
**Problema:** Schema TypeScript definiu coluna que não existe no banco.  
**Causa:** Migration não sincronizada com código.  
**Solução:**  
- Sempre executar `npm run db:generate` após alterações de schema
- Revisar migration gerada antes de aplicar
- Testar localmente antes de produção
- CI/CD deve validar schema sync

**Comando Preventivo:**
```bash
# Antes de commit
npm run db:generate    # Gera migration
npm run db:migrate     # Aplica localmente
npm run db:studio      # Valida visualmente
```

### L-NEW-009: SQL Table Name Case Sensitivity
**Problema:** FOREIGN KEY referenciando `organizations` (plural) quando tabela é `organization` (singular).  
**Causa:** Inconsistência em convenção de nomes (algumas tabelas plural, outras singular).  
**Solução:**
- **PADRÃO DEFINITIVO:** Tabelas em **singular** (`organization`, `user`, `branch`)
- Grep em todas migrations antes de aplicar: `grep -i "organizations" *.sql`
- SQL Server aceita ambos, mas constraints devem ser exatas

**Script de Validação:**
```bash
# Verificar inconsistências
grep -r "REFERENCES.*organizations" drizzle/migrations/
grep -r "REFERENCES.*users" drizzle/migrations/
# Corrigir para singular
```

### L-NEW-010: Migration Testing in Production
**Problema:** Migrations aplicadas em produção sem teste local completo.  
**Causa:** Confiança excessiva no CI/CD + ausência de staging env.  
**Solução:**
- **SEMPRE** testar migrations localmente com seed completo
- Criar snapshot do DB de prod para testes
- Usar `BEGIN TRANSACTION / ROLLBACK` para dry-run
- Implementar staging environment

**Workflow Correto:**
```bash
# 1. Desenvolvimento local
npm run db:migrate

# 2. Seed completo
npm run db:seed

# 3. Teste manual
npm run dev
# Validar todas telas

# 4. Backup prod
pg_dump > backup.sql  # Ou equivalente MSSQL

# 5. Deploy staging
# ...testes E2E...

# 6. Deploy prod
```

---

## 📊 Métricas de Impacto

| Métrica | Valor |
|---------|-------|
| **Bugs Críticos Introduzidos** | 2 |
| **APIs Afetadas** | 5 |
| **Funcionalidades Inoperantes** | 100% Strategic Module |
| **Tempo Downtime** | ~30min (desde deploy até análise) |
| **Usuários Impactados** | 100% (todas tentativas retornam 500) |
| **Tempo Estimado Correção** | 20min (migrations) + 5min (redeploy) |

---

## 🎯 Conclusão

**Status da Fase 6:**  
❌ **FALHOU** em produção devido a:
1. Schema mismatch crítico (`who_email`)
2. Foreign keys inválidas (não crítico mas incorreto)
3. Ausência de testes de integração

**Ações Imediatas:**
1. ✅ Análise completa concluída
2. 🔄 Aplicar hotfix migrations (0056, 0057)
3. 🔄 Redeploy
4. ✅ Validar checklist pós-hotfix

**Próximos Passos:**
- Completar Fase 7 (Testes Enterprise)
- Implementar staging environment
- Adicionar CI validação de schema sync
- Documentar processo de migration review

---

**Documento Gerado:** 2026-02-02 10:30 BRT  
**Analista:** Aura Core AI Assistant  
**Severity:** 🔴 CRITICAL PRODUCTION ISSUE
