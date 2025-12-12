# 🏢 AuraCore - Arquitetura Multi-Tenant SaaS

## 🎯 Visão Geral

O **AuraCore** foi refatorado para ser um **SaaS Multi-Tenant**, permitindo que múltiplas empresas (organizações) usem o mesmo sistema com **isolamento total de dados**.

---

## 🏗️ Arquitetura Multi-Tenant

### **Conceitos Chave**

- **Tenant (Inquilino)**: Uma empresa/organização que contrata o AuraCore
- **Organization**: A entidade que representa cada Tenant no banco
- **Isolamento de Dados**: Cada tenant só vê seus próprios dados
- **Single Database**: Todos os tenants compartilham o mesmo banco, mas com separação lógica via `organization_id`

---

## 📊 Modelo de Dados

### **1. Tabela `organizations` (Inquilinos)**

A tabela central do multi-tenancy.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT | Primary Key |
| `name` | VARCHAR(255) | Razão Social do cliente SaaS |
| `slug` | VARCHAR(100) | URL amigável (**único**) Ex: 'transportadora-abc' |
| `document` | VARCHAR(20) | CNPJ da empresa contratante (**único**) |
| `plan` | VARCHAR(20) | FREE, PRO, ENTERPRISE |
| `stripeCustomerId` | VARCHAR(100) | ID do cliente no Stripe (futuro) |
| `status` | VARCHAR(20) | ACTIVE, SUSPENDED, CANCELED |
| `createdAt` | DATETIME2 | Data de criação |
| `updatedAt` | DATETIME2 | Data de atualização |

**Índices:**
- `slug` (UNIQUE) - Garante URLs únicas (ex: auracore.com/transportadora-abc)
- `document` (UNIQUE) - Garante 1 conta por CNPJ

---

### **2. Vínculos de Propriedade (Organization ID)**

**Todas** as tabelas principais agora possuem `organization_id`:

```
organizations (1) ──┬─ (N) users
                    ├─ (N) branches
                    └─ (N) business_partners
```

#### **Tabelas Afetadas:**

##### A. `users`
```sql
organization_id INT NOT NULL FOREIGN KEY → organizations.id
```
- Um usuário pertence a **UMA** organização
- Email pode repetir entre organizações (user@empresa.com pode existir em várias orgs)

##### B. `branches`
```sql
organization_id INT NOT NULL FOREIGN KEY → organizations.id
```
- Uma filial pertence a **UMA** organização
- Cada tenant tem suas próprias filiais (matriz + filiais)

##### C. `business_partners`
```sql
organization_id INT NOT NULL FOREIGN KEY → organizations.id
```
- Clientes/Fornecedores pertencem a **UMA** organização
- Cliente "ABC" da Org 1 é diferente de Cliente "ABC" da Org 2

---

## 🔐 Isolamento de Dados

### **Estratégia Implementada: Row-Level Isolation**

Cada query **SEMPRE** filtra por `organization_id`:

```typescript
// ❌ ERRADO (vazamento de dados entre tenants)
const users = await db.select().from(users);

// ✅ CORRETO (isolamento por tenant)
const users = await db
  .select()
  .from(users)
  .where(eq(users.organizationId, currentOrganizationId));
```

### **Como Obter o `organization_id` Atual?**

O `organization_id` será injetado via **sessão do usuário logado**:

```typescript
// No futuro, via Auth Session
const session = await auth();
const organizationId = session.user.organizationId;

// Todas as queries filtram automaticamente
const branches = await db
  .select()
  .from(branches)
  .where(eq(branches.organizationId, organizationId));
```

---

## 🌱 Seed Multi-Tenant

O script de seed agora cria:

### **1. Organização (ID 1)**
```typescript
{
  name: "AURACORE LOGÍSTICA LTDA",
  slug: "auracore-hq",
  document: "00000000000191",
  plan: "ENTERPRISE",
  status: "ACTIVE"
}
```

### **2. Branch Matriz (Vinculada à Org 1)**
```typescript
{
  organizationId: 1, // 🔑 Vínculo
  name: "AURACORE - MATRIZ",
  document: "00000000000191",
  // ... outros campos
}
```

### **3. Usuário Admin (Vinculado à Org 1)**
```typescript
{
  organizationId: 1, // 🔑 Vínculo
  email: "admin@auracore.com",
  role: "ADMIN",
  // ... outros campos
}
```

---

## 🚀 Migração de Dev para Multi-Tenant

### **Passo 1: Limpar Banco**

Como adicionamos `organization_id NOT NULL` em tabelas existentes, precisamos resetar:

```bash
npx tsx -r dotenv/config scripts/reset-db.ts
```

**⚠️ ATENÇÃO:** Isso vai **EXCLUIR TODOS OS DADOS**! Use apenas em DEV.

### **Passo 2: Gerar e Aplicar Migrations**

```bash
# Gerar migration SQL
npx drizzle-kit generate

# Aplicar no banco
npx drizzle-kit migrate
```

### **Passo 3: Executar Seed Multi-Tenant**

```bash
npx tsx -r dotenv/config scripts/seed.ts
```

**Output Esperado:**
```
🚀 Iniciando Seed do AuraCore (Multi-Tenant SaaS)...
✅ Organização criada (ID 1)
✅ Branch Matriz criada
✅ Admin criado com sucesso
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SEED CONCLUÍDO - MULTI-TENANT CONFIGURADO!
```

---

## 📡 Próximos Passos nas APIs

### **Middleware de Tenant Context (Futuro)**

Criar um middleware que injeta automaticamente o `organization_id`:

```typescript
// middleware/tenant.ts
export async function getTenantId(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.organizationId) {
    throw new Error("Unauthorized: No tenant context");
  }
  
  return session.user.organizationId;
}
```

### **Atualizar APIs para Filtrar por Tenant**

Exemplo: `/api/branches/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const organizationId = await getTenantId(request);
  
  // Filtra automaticamente pelo tenant
  const branches = await db
    .select()
    .from(branches)
    .where(eq(branches.organizationId, organizationId));
  
  return NextResponse.json({ data: branches });
}
```

---

## 🎨 Frontend Multi-Tenant

### **Recursos Necessários:**

1. **Seletor de Organização** (apenas para Super Admin)
2. **Context de Tenant** (armazenar organização atual)
3. **Branding por Tenant** (logo, cores, nome)
4. **Subdomain Routing** (opcional):
   - `transportadora-abc.auracore.com` → Org "transportadora-abc"
   - `logistica-xyz.auracore.com` → Org "logistica-xyz"

---

## 📋 Planos e Limitações (Futuro)

### **FREE**
- 1 Filial
- 10 Usuários
- 100 Parceiros de Negócio

### **PRO**
- 5 Filiais
- 50 Usuários
- 1.000 Parceiros

### **ENTERPRISE**
- Ilimitado
- Suporte Premium
- API Personalizada

---

## 🔒 Segurança Multi-Tenant

### **Regras Críticas:**

1. ✅ **Sempre filtrar por `organization_id`** em todas as queries
2. ✅ **Validar permissões** antes de permitir acesso
3. ✅ **Nunca confiar** apenas no ID do recurso (ex: `/api/branches/1`)
4. ✅ **Verificar propriedade** antes de atualizar/deletar:

```typescript
// Antes de deletar, verifica se pertence ao tenant
const [branch] = await db
  .select()
  .from(branches)
  .where(
    and(
      eq(branches.id, id),
      eq(branches.organizationId, organizationId)
    )
  );

if (!branch) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

---

## 🧪 Testando Multi-Tenancy

### **Cenário de Teste:**

1. Criar Organização 1 (Transportadora ABC)
2. Criar Organização 2 (Logística XYZ)
3. Logar como Admin da Org 1
4. Tentar acessar dados da Org 2 → **Deve falhar (403)**

---

## 📊 Diagrama da Arquitetura

```
┌─────────────────────────────────────────┐
│  TENANT 1: Transportadora ABC           │
│  ├─ Organizations (ID 1)                │
│  ├─ Branches (3 filiais)                │
│  ├─ Users (25 usuários)                 │
│  └─ Business Partners (500 clientes)    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  TENANT 2: Logística XYZ                │
│  ├─ Organizations (ID 2)                │
│  ├─ Branches (1 filial)                 │
│  ├─ Users (5 usuários)                  │
│  └─ Business Partners (50 clientes)     │
└─────────────────────────────────────────┘

       ↓ Todos no mesmo SQL Server ↓
       
┌─────────────────────────────────────────┐
│  BANCO DE DADOS ÚNICO (AuraCore)        │
│  ├─ organizations (2 registros)         │
│  ├─ branches (4 registros)              │
│  │   └─ organization_id → FK            │
│  ├─ users (30 registros)                │
│  │   └─ organization_id → FK            │
│  └─ business_partners (550 registros)   │
│      └─ organization_id → FK            │
└─────────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

### **Backend (✅ Concluído)**
- [x] Tabela `organizations` criada
- [x] `organization_id` adicionado em `users`, `branches`, `business_partners`
- [x] Foreign Keys configuradas (ON DELETE CASCADE)
- [x] Validators Zod para organizations
- [x] Script de seed multi-tenant
- [x] Script de reset do banco

### **Próximos Passos**
- [ ] Middleware de tenant context
- [ ] Atualizar todas as APIs para filtrar por `organization_id`
- [ ] Criar API de gerenciamento de organizações (CRUD)
- [ ] Implementar seletor de organização no frontend
- [ ] Sistema de planos e limitações
- [ ] Integração com Stripe para pagamentos
- [ ] Subdomain routing (opcional)

---

**🎉 AuraCore está PRONTO para ser um SaaS Multi-Tenant!**

**Desenvolvido para AuraCore SaaS**  
Versão: 3.0.0 (Multi-Tenant)  
Data: Dezembro/2024















