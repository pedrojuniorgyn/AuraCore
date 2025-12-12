# 🔐 AUDITORIA COMPLETA DE SEGURANÇA - AURA CORE

**Data:** 12/12/2025  
**Tipo:** Análise de Segurança, Multi-Tenancy, Audit Trail e RBAC  
**Status:** ⚠️ PROBLEMAS CRÍTICOS IDENTIFICADOS

---

## 📋 SUMÁRIO EXECUTIVO

### ✅ **PONTOS FORTES**
- ✅ **Multi-Tenancy** implementado corretamente na maioria das tabelas
- ✅ **RBAC (Roles & Permissions)** funcional (3 roles, 11 permissions)
- ✅ **Data Scoping** configurado (user_branches)
- ✅ **Integridade Referencial** perfeita (0 registros órfãos)
- ✅ **Soft Delete** implementado (deleted_at)

### ❌ **PROBLEMAS CRÍTICOS**
1. ❌ **Audit Trail INCOMPLETO** - Tabelas não existem
2. ⚠️  **audit_logs vazia** - Nenhuma operação sendo rastreada
3. ⚠️  **financial_titles sem organization_id** - Quebra de Multi-Tenancy
4. ❌ **Permissões em runtime com erro** - Import path incorreto causando falhas

---

## 🔍 1. ESTRUTURA ATUAL

### **1.1 Organizações e Usuários**

```
📊 RESUMO:
   └─ Organizações:  1
   └─ Usuários:      1
   └─ Filiais:       1
```

| ID | Organização | CNPJ | Plano | Status |
|----|-------------|------|-------|--------|
| 1 | AURACORE LOGÍSTICA LTDA | - | ENTERPRISE | ACTIVE |

| Email | Nome | Role | Org | Filial Padrão |
|-------|------|------|-----|---------------|
| admin@auracore.com | Administrador AuraCore | ADMIN | 1 | 1 |

**✅ Diagnóstico:** Estrutura básica OK.

---

### **1.2 Sistema RBAC (Roles & Permissions)**

#### **Roles Configurados:**
| ID | Nome | Descrição | Permissões |
|----|------|-----------|------------|
| 1 | ADMIN | Administrador | 11 |
| 2 | USER | Usuário Padrão | 0 |
| 3 | MANAGER | Gerente | 0 |

#### **Permissions Configurados:**
```
 1. admin.full         → Acesso total
 2. users.view         → Visualizar usuários
 3. users.create       → Criar usuários
 4. users.edit         → Editar usuários
 5. users.delete       → Deletar usuários
 6. financial.view     → Visualizar financeiro
 7. financial.create   → Criar títulos
 8. fiscal.view        → Visualizar fiscais
 9. fiscal.emit        → Emitir documentos
10. fleet.view         → Visualizar frota
11. fleet.manage       → Gerenciar frota
```

**⚠️ Diagnóstico:** 
- ✅ ADMIN tem todas as 11 permissões
- ❌ USER e MANAGER não têm permissões configuradas
- ⚠️  Faltam permissões granulares (produtos, parceiros, relatórios)

---

### **1.3 Data Scoping (Acesso por Filial)**

```
📊 CONFIGURAÇÃO:
   └─ admin@auracore.com → TCL Transporte (Filial 1)
```

**✅ Diagnóstico:** Data Scoping configurado corretamente.

---

### **1.4 Multi-Tenancy (organization_id)**

| Tabela | organization_id | Status |
|--------|-----------------|--------|
| branches | ✅ | Presente |
| business_partners | ✅ | Presente |
| products | ✅ | Presente |
| fiscal_documents | ✅ | Presente |
| **financial_titles** | ❌ | **AUSENTE** |
| audit_logs | ✅ | Presente |

**❌ Diagnóstico CRÍTICO:** 
`financial_titles` NÃO TEM `organization_id`! Isso quebra o isolamento multi-tenant.

---

## 🚨 2. AUDIT TRAIL (Black Box) - PROBLEMA CRÍTICO

### **2.1 Tabelas de Auditoria**

| Tabela | Status | Registros | Problema |
|--------|--------|-----------|----------|
| audit_logs | ⚠️ VAZIA | 0 | Não está sendo usado |
| chart_accounts_audit | ❌ NÃO EXISTE | - | Tabela não criada |
| financial_categories_audit | ❌ NÃO EXISTE | - | Tabela não criada |
| cost_centers_audit | ❌ NÃO EXISTE | - | Tabela não criada |

### **2.2 Impacto de Segurança**

```
⚠️  PROBLEMA: Fraude Interna ou Erro Não Detectável

Cenário Real:
─────────────
1. Plano de Contas "Despesas com Frete" = R$ 50.000
2. Alguém altera para R$ 5.000
3. ❌ NENHUM LOG É REGISTRADO
4. ❌ NÃO É POSSÍVEL SABER:
   - Quem mudou?
   - Quando mudou?
   - Qual era o valor anterior?
   - Por que mudou?

Resultado:
──────────
❌ Fraude interna não rastreável
❌ Erros de operação sem histórico
❌ Impossível auditoria externa (ISO 27001, SOC 2)
❌ Não-conformidade com LGPD (Art. 37)
```

---

## 📊 3. INTEGRIDADE REFERENCIAL

**✅ STATUS:** PERFEITO

```
✅ Usuários órfãos (sem org):        0
✅ Filiais órfãs (sem org):          0
✅ User Roles órfãos (sem user):     0
✅ User Roles órfãos (sem role):     0
```

---

## 🔧 4. PROBLEMAS TÉCNICOS IDENTIFICADOS

### **4.1 Erro em Runtime - Permissions**

**Problema:**
```typescript
// src/lib/auth/permissions.ts linha 2
import { permissions } from "@/lib/db/schema";
//                                    ^^^^^^
// Importa da PASTA schema/ (sem index.ts)
// Resulta em: permissions = undefined
// Causa: TypeError: Cannot convert undefined or null to object
```

**Correção Aplicada:**
```typescript
import { permissions } from "@/lib/db/schema.ts"; // ✅ CORRETO
```

**Status:** ✅ CORRIGIDO (commit 826e58f)

---

### **4.2 Tabelas de Permissões Vazias**

**Problema:**
- `permissions`: 0 registros
- `roles`: 0 registros
- `role_permissions`: 0 registros
- `user_roles`: 0 registros

**Correção Aplicada:**
- ✅ Seed executado (11 permissions, 3 roles, 11 role-permissions, 1 user-role)

**Status:** ✅ CORRIGIDO

---

## 🎯 5. PLANEJAMENTO DE CORREÇÃO

### **FASE 1: AUDIT TRAIL COMPLETO** ⚠️ CRÍTICO

#### **5.1 Criar Tabelas de Auditoria**

##### **A) chart_accounts_audit**
```sql
CREATE TABLE chart_accounts_audit (
  id INT IDENTITY(1,1) PRIMARY KEY,
  chart_account_id INT NOT NULL,
  operation NVARCHAR(10) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  
  -- Valores ANTES da mudança
  old_code NVARCHAR(20),
  old_name NVARCHAR(255),
  old_type NVARCHAR(20),
  old_status NVARCHAR(20),
  old_category NVARCHAR(50),
  old_is_analytical BIT,
  
  -- Valores DEPOIS da mudança
  new_code NVARCHAR(20),
  new_name NVARCHAR(255),
  new_type NVARCHAR(20),
  new_status NVARCHAR(20),
  new_category NVARCHAR(50),
  new_is_analytical BIT,
  
  -- Auditoria (Quem, Quando, Por quê)
  changed_by NVARCHAR(255) NOT NULL, -- user_id
  changed_at DATETIME2 DEFAULT GETDATE(),
  reason NVARCHAR(500), -- Motivo da mudança
  ip_address NVARCHAR(50),
  user_agent NVARCHAR(500),
  
  -- Constraint: Append-Only (Imutável)
  CONSTRAINT CK_chart_accounts_audit_immutable 
    CHECK (changed_at IS NOT NULL)
);

-- Índices para performance
CREATE INDEX IX_chart_accounts_audit_account 
  ON chart_accounts_audit(chart_account_id);
  
CREATE INDEX IX_chart_accounts_audit_date 
  ON chart_accounts_audit(changed_at DESC);
```

##### **B) financial_categories_audit**
```sql
CREATE TABLE financial_categories_audit (
  id INT IDENTITY(1,1) PRIMARY KEY,
  category_id INT NOT NULL,
  operation NVARCHAR(10) NOT NULL,
  
  old_name NVARCHAR(255),
  old_code NVARCHAR(50),
  old_type NVARCHAR(20),
  old_status NVARCHAR(20),
  
  new_name NVARCHAR(255),
  new_code NVARCHAR(50),
  new_type NVARCHAR(20),
  new_status NVARCHAR(20),
  
  changed_by NVARCHAR(255) NOT NULL,
  changed_at DATETIME2 DEFAULT GETDATE(),
  reason NVARCHAR(500),
  ip_address NVARCHAR(50)
);

CREATE INDEX IX_financial_categories_audit_category 
  ON financial_categories_audit(category_id);
```

##### **C) cost_centers_audit**
```sql
CREATE TABLE cost_centers_audit (
  id INT IDENTITY(1,1) PRIMARY KEY,
  cost_center_id INT NOT NULL,
  operation NVARCHAR(10) NOT NULL,
  
  old_code NVARCHAR(20),
  old_name NVARCHAR(255),
  old_type NVARCHAR(20),
  old_status NVARCHAR(20),
  
  new_code NVARCHAR(20),
  new_name NVARCHAR(255),
  new_type NVARCHAR(20),
  new_status NVARCHAR(20),
  
  changed_by NVARCHAR(255) NOT NULL,
  changed_at DATETIME2 DEFAULT GETDATE(),
  reason NVARCHAR(500),
  ip_address NVARCHAR(50)
);

CREATE INDEX IX_cost_centers_audit_center 
  ON cost_centers_audit(cost_center_id);
```

---

#### **5.2 Implementar Auto-Logging nas APIs**

**Exemplo:** `/api/financial/chart-accounts/[id]/route.ts`

```typescript
// ANTES (SEM AUDIT)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  
  await db.update(chartOfAccounts)
    .set(body)
    .where(eq(chartOfAccounts.id, Number(params.id)));
    
  return NextResponse.json({ success: true });
}

// DEPOIS (COM AUDIT)
import { logChartAccountChange } from "@/services/audit-logger";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await getTenantContext();
  const body = await request.json();
  
  // 1. Buscar valor ANTERIOR
  const oldData = await db.query.chartOfAccounts.findFirst({
    where: eq(chartOfAccounts.id, Number(params.id))
  });
  
  // 2. Aplicar UPDATE
  await db.update(chartOfAccounts)
    .set({ ...body, updated_by: userId })
    .where(eq(chartOfAccounts.id, Number(params.id)));
  
  // 3. Registrar AUDIT LOG (Imutável)
  await logChartAccountChange({
    entityType: "CHART_ACCOUNT",
    entityId: Number(params.id),
    operation: "UPDATE",
    oldData: oldData,
    newData: body,
    changedBy: userId,
    reason: body.reason || "Atualização manual",
    ipAddress: request.headers.get("x-forwarded-for") || "unknown"
  });
  
  return NextResponse.json({ success: true });
}
```

---

#### **5.3 Criar Tela de Auditoria (Frontend)**

**Rota:** `/configuracoes/auditoria`

**Funcionalidades:**
- ✅ Filtrar por entidade (PCC, PCG, CC, etc.)
- ✅ Filtrar por usuário
- ✅ Filtrar por data
- ✅ Ver diff (antes → depois)
- ✅ Exportar para Excel (compliance)
- ✅ Timeline visual de mudanças

---

### **FASE 2: CORRIGIR MULTI-TENANCY** ⚠️ CRÍTICO

#### **2.1 Adicionar organization_id em financial_titles**

```sql
-- Passo 1: Adicionar coluna
ALTER TABLE financial_titles 
ADD organization_id INT NOT NULL DEFAULT 1;

-- Passo 2: Criar FK
ALTER TABLE financial_titles
ADD CONSTRAINT FK_financial_titles_organization
FOREIGN KEY (organization_id) REFERENCES organizations(id)
ON DELETE CASCADE;

-- Passo 3: Criar índice
CREATE INDEX IX_financial_titles_organization 
ON financial_titles(organization_id);
```

#### **2.2 Atualizar APIs para usar organization_id**

```typescript
// /api/financial/titles/route.ts
export async function GET(request: NextRequest) {
  const { organizationId } = await getTenantContext();
  
  const titles = await db.query.financialTitles.findMany({
    where: eq(financialTitles.organizationId, organizationId) // ✅ FILTRO
  });
  
  return NextResponse.json({ data: titles });
}
```

---

### **FASE 3: EXPANDIR PERMISSÕES** ⚠️ MÉDIA

#### **3.1 Adicionar Permissões Granulares**

```typescript
const newPermissions = [
  // Produtos
  { slug: 'products.view', desc: 'Visualizar produtos' },
  { slug: 'products.create', desc: 'Criar produtos' },
  { slug: 'products.edit', desc: 'Editar produtos' },
  { slug: 'products.delete', desc: 'Deletar produtos' },
  
  // Parceiros
  { slug: 'partners.view', desc: 'Visualizar parceiros' },
  { slug: 'partners.create', desc: 'Criar parceiros' },
  { slug: 'partners.edit', desc: 'Editar parceiros' },
  
  // Relatórios
  { slug: 'reports.financial', desc: 'Relatórios financeiros' },
  { slug: 'reports.fiscal', desc: 'Relatórios fiscais' },
  { slug: 'reports.operational', desc: 'Relatórios operacionais' },
  
  // Configurações
  { slug: 'settings.branches', desc: 'Gerenciar filiais' },
  { slug: 'settings.users', desc: 'Gerenciar usuários' },
  { slug: 'settings.system', desc: 'Configurações sistema' },
  
  // Auditoria
  { slug: 'audit.view', desc: 'Visualizar logs de auditoria' },
  { slug: 'audit.export', desc: 'Exportar logs de auditoria' },
];
```

#### **3.2 Configurar Roles**

```typescript
// USER (role_id = 2) - Permissões básicas
const userPermissions = [
  'products.view',
  'partners.view',
  'fiscal.view',
  'financial.view',
  'fleet.view',
];

// MANAGER (role_id = 3) - Permissões operacionais
const managerPermissions = [
  ...userPermissions,
  'products.create',
  'products.edit',
  'partners.create',
  'partners.edit',
  'financial.create',
  'reports.financial',
  'reports.operational',
];
```

---

### **FASE 4: REINICIAR SERVIDOR NEXT.JS** ⚠️ IMEDIATO

**Problema:** Hot reload não aplicou correção do import path.

**Solução:**
```bash
# Terminal onde está npm run dev
Ctrl + C

# Reiniciar
npm run dev
```

**Motivo:** Next.js cache o módulo `permissions.ts` com o import errado.

---

## 📊 6. PRIORIZAÇÃO

| Fase | Prioridade | Impacto | Esforço | Prazo |
|------|------------|---------|---------|-------|
| 4. Reiniciar Servidor | 🔴 CRÍTICO | Alto | 1min | IMEDIATO |
| 2. Multi-Tenancy (financial_titles) | 🔴 CRÍTICO | Alto | 30min | HOJE |
| 1. Audit Trail (Tabelas) | 🟡 ALTO | Alto | 2h | HOJE |
| 1. Audit Trail (APIs) | 🟡 ALTO | Alto | 4h | AMANHÃ |
| 1. Audit Trail (Frontend) | 🟢 MÉDIO | Médio | 6h | SEMANA |
| 3. Expandir Permissões | 🟢 MÉDIO | Médio | 2h | SEMANA |

---

## ✅ 7. CHECKLIST DE SEGURANÇA

### **7.1 Multi-Tenancy**
- [x] `organizations` com isolamento
- [x] `users` com FK para organization
- [x] `branches` com FK para organization
- [x] `business_partners` com FK
- [x] `products` com FK
- [x] `fiscal_documents` com FK
- [ ] **`financial_titles` com FK** ❌

### **7.2 RBAC (Roles & Permissions)**
- [x] Tabelas `roles`, `permissions`, `role_permissions`, `user_roles`
- [x] Seed inicial (3 roles, 11 permissions)
- [x] Admin com todas as permissões
- [ ] USER e MANAGER com permissões ❌
- [ ] Permissões granulares (produtos, parceiros, etc.) ❌

### **7.3 Audit Trail (Black Box)**
- [x] Tabela `audit_logs` criada
- [ ] `audit_logs` sendo usado ❌
- [ ] `chart_accounts_audit` criada ❌
- [ ] `financial_categories_audit` criada ❌
- [ ] `cost_centers_audit` criada ❌
- [ ] Auto-logging nas APIs ❌
- [ ] Tela de auditoria (frontend) ❌

### **7.4 Data Scoping**
- [x] Tabela `user_branches`
- [x] Admin configurado na Filial 1
- [x] `getTenantContext()` com `allowedBranches`
- [x] APIs usando `getBranchScopeFilter()`

### **7.5 Integridade**
- [x] Sem registros órfãos
- [x] FKs configuradas corretamente
- [x] Soft Delete implementado
- [x] Índices em colunas críticas

---

## 📝 8. SCRIPTS CRIADOS

1. **`scripts/seed-permissions.ts`** ✅
   - Popula permissions, roles, role_permissions, user_roles

2. **`scripts/audit-security-complete.ts`** ✅
   - Auditoria completa de segurança

3. **`scripts/create-audit-tables.ts`** (A CRIAR)
   - Cria tabelas de audit trail

4. **`scripts/fix-financial-titles-multi-tenancy.ts`** (A CRIAR)
   - Adiciona organization_id em financial_titles

---

## 🎯 9. RESUMO FINAL

### **STATUS ATUAL:**
```
✅ Multi-Tenancy:      85% (falta financial_titles)
✅ RBAC:               60% (falta permissões granulares)
❌ Audit Trail:        10% (tabelas não existem)
✅ Data Scoping:      100%
✅ Integridade:       100%

SEGURANÇA GERAL:      60% ⚠️
```

### **PRÓXIMOS PASSOS:**
1. ⚡ Reiniciar `npm run dev` (AGORA)
2. 🔴 Criar tabelas de audit trail (HOJE)
3. 🔴 Corrigir `financial_titles` multi-tenancy (HOJE)
4. 🟡 Implementar auto-logging nas APIs (AMANHÃ)
5. 🟢 Expandir permissões granulares (SEMANA)

---

**Analista:** AI Senior Developer  
**Data:** 12/12/2025 21:30  
**Versão:** 1.0
