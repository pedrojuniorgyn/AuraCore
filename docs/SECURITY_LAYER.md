# 🔐 AuraCore - Camada de Segurança SaaS

## 📋 Visão Geral

Este documento detalha a implementação completa da **Camada de Segurança SaaS** do AuraCore, que garante:
- 🔒 **Isolamento Multi-Tenant** (dados nunca vazam entre organizações)
- 📊 **Auditoria Completa** (quem criou/alterou cada registro)
- 🔄 **Controle de Concorrência** (Optimistic Locking)
- 🗑️ **Soft Delete** (recuperação de dados)
- 🏢 **Data Scoping** (controle de acesso por filial)

---

## 🎯 Arquitetura de Segurança

### **Camadas de Proteção:**

```
┌─────────────────────────────────────────────┐
│  1. AUTHENTICATION (Next-Auth)              │
│     - Login Google + Credentials            │
│     - Session JWT com dados vitais          │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  2. TENANT CONTEXT (getTenantContext())     │
│     - Extrai organizationId da sessão       │
│     - Valida autenticação (401)             │
│     - Retorna contexto tipado               │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  3. DATA LAYER (Drizzle Queries)            │
│     - Filtra por organization_id            │
│     - Filtra por deleted_at IS NULL         │
│     - Filtra por allowed_branches (se não admin)
└─────────────────────────────────────────────┘
```

---

## 🔐 1. Sessão Estendida (Next-Auth)

### **Configuração (`src/lib/auth.ts`):**

A sessão JWT foi estendida para incluir dados vitais que evitam consultas repetitivas ao banco:

```typescript
session.user = {
  id: string;                // ID do usuário (UUID)
  email: string;             // Email
  name: string;              // Nome
  role: string;              // 'ADMIN', 'USER', etc.
  organizationId: number;    // 🔑 VITAL: ID da organização (tenant)
  defaultBranchId: number;   // Filial padrão ao logar
  allowedBranches: number[]; // 🏢 Array de IDs de filiais permitidas
}
```

### **Callbacks Implementados:**

#### **jwt() - Ao fazer login:**
```typescript
async jwt({ token, user }) {
  if (user) {
    token.id = user.id;
    token.role = user.role;
    token.organizationId = user.organizationId;
    token.defaultBranchId = user.defaultBranchId;
    
    // Busca filiais permitidas (Data Scoping)
    const userBranchesData = await db
      .select({ branchId: schema.userBranches.branchId })
      .from(schema.userBranches)
      .where(eq(schema.userBranches.userId, user.id));
    
    token.allowedBranches = userBranchesData.map((ub) => ub.branchId);
  }
  return token;
}
```

#### **session() - Em cada requisição:**
```typescript
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id;
    session.user.role = token.role;
    session.user.organizationId = token.organizationId;
    session.user.defaultBranchId = token.defaultBranchId;
    session.user.allowedBranches = token.allowedBranches;
  }
  return session;
}
```

### **Validação de Soft Delete:**

No `authorize()` do Credentials Provider:
```typescript
// Verifica se o usuário está deletado (soft delete)
if (user.deletedAt) {
  return null; // Bloqueia login
}
```

---

## 🛡️ 2. Tenant Context (`src/lib/auth/context.ts`)

### **Helper Reutilizável: `getTenantContext()`**

Função que **TODAS** as rotas de API devem chamar no início:

```typescript
export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth();

  if (!session || !session.user) {
    throw NextResponse.json(
      { error: "Não autenticado", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role,
    defaultBranchId: session.user.defaultBranchId,
    allowedBranches: session.user.allowedBranches,
    isAdmin: session.user.role === "ADMIN",
  };
}
```

### **Uso nas APIs:**

```typescript
export async function GET(request: NextRequest) {
  // 🔐 SEGURANÇA: Obtém contexto (valida autenticação)
  const ctx = await getTenantContext();
  
  // Agora você tem acesso a:
  // - ctx.organizationId (VITAL para Multi-Tenant)
  // - ctx.userId (para auditoria)
  // - ctx.role (para permissões)
  // - ctx.isAdmin (booleano)
  // - ctx.allowedBranches (para Data Scoping)
  
  // ... resto da lógica
}
```

### **Helpers Adicionais:**

#### **hasAccessToBranch():**
```typescript
if (!hasAccessToBranch(ctx, branchId)) {
  return NextResponse.json(
    { error: "Você não tem permissão para acessar esta filial." },
    { status: 403 }
  );
}
```

#### **getBranchScopeFilter():**
```typescript
const branches = await db
  .select()
  .from(branches)
  .where(and(
    eq(branches.organizationId, ctx.organizationId),
    ...getBranchScopeFilter(ctx, branches.id) // Aplica Data Scoping
  ));
```

---

## 📊 3. Padrão de Queries Seguras

### **GET - Listagem:**

```typescript
export async function GET(request: NextRequest) {
  const ctx = await getTenantContext();

  const data = await db
    .select()
    .from(businessPartners)
    .where(
      and(
        eq(businessPartners.organizationId, ctx.organizationId), // 🔐 Multi-Tenant
        isNull(businessPartners.deletedAt) // 🗑️ Apenas ativos
      )
    );

  return NextResponse.json({ data, total: data.length });
}
```

### **GET by ID - Busca Individual:**

```typescript
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext();
  const id = parseInt(params.id);

  const [record] = await db
    .select()
    .from(businessPartners)
    .where(
      and(
        eq(businessPartners.id, id),
        eq(businessPartners.organizationId, ctx.organizationId), // 🔐 Valida propriedade
        isNull(businessPartners.deletedAt)
      )
    );

  if (!record) {
    return NextResponse.json(
      { error: "Não encontrado ou sem permissão." },
      { status: 404 }
    );
  }

  return NextResponse.json(record);
}
```

### **POST - Criação:**

```typescript
export async function POST(request: NextRequest) {
  const ctx = await getTenantContext();
  const body = await request.json();

  // Validação Zod
  const parsedBody = schema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ errors: parsedBody.error }, { status: 400 });
  }

  // Verifica duplicidade dentro da organização
  const [existing] = await db
    .select()
    .from(businessPartners)
    .where(
      and(
        eq(businessPartners.organizationId, ctx.organizationId), // 🔐
        eq(businessPartners.document, parsedBody.data.document),
        isNull(businessPartners.deletedAt)
      )
    );

  if (existing) {
    return NextResponse.json({ error: "Documento já cadastrado." }, { status: 409 });
  }

  // Cria com Enterprise Base Pattern
  const [newRecord] = await db.insert(businessPartners).values({
    ...parsedBody.data,
    organizationId: ctx.organizationId, // 🔐 INJETA (não confia no front)
    createdBy: ctx.userId,              // 📊 Auditoria
    updatedBy: ctx.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    version: 1,                         // 🔒 Optimistic Lock
  }).returning();

  return NextResponse.json(newRecord, { status: 201 });
}
```

### **PUT - Atualização:**

```typescript
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext();
  const id = parseInt(params.id);
  const body = await request.json();

  // Busca registro atual com validação de propriedade
  const [current] = await db
    .select()
    .from(businessPartners)
    .where(
      and(
        eq(businessPartners.id, id),
        eq(businessPartners.organizationId, ctx.organizationId), // 🔐
        isNull(businessPartners.deletedAt)
      )
    );

  if (!current) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  // 🔒 OPTIMISTIC LOCK: Valida versão
  if (body.version !== undefined && body.version !== current.version) {
    return NextResponse.json({
      error: "Conflito de versão",
      details: "Registro foi alterado por outro usuário. Recarregue e tente novamente.",
      currentVersion: current.version,
    }, { status: 409 });
  }

  // Atualiza com incremento de versão
  const [updated] = await db
    .update(businessPartners)
    .set({
      ...parsedBody.data,
      updatedBy: ctx.userId,              // 📊 Auditoria
      updatedAt: new Date(),
      version: current.version + 1,       // 🔒 Incrementa versão
    })
    .where(
      and(
        eq(businessPartners.id, id),
        eq(businessPartners.organizationId, ctx.organizationId),
        eq(businessPartners.version, current.version) // Double-check
      )
    )
    .returning();

  return NextResponse.json(updated);
}
```

### **DELETE - Soft Delete:**

```typescript
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext();
  const id = parseInt(params.id);

  // Busca registro atual com validação de propriedade
  const [current] = await db
    .select()
    .from(businessPartners)
    .where(
      and(
        eq(businessPartners.id, id),
        eq(businessPartners.organizationId, ctx.organizationId), // 🔐
        isNull(businessPartners.deletedAt)
      )
    );

  if (!current) {
    return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
  }

  // 🗑️ SOFT DELETE: Marca como deletado
  const [deleted] = await db
    .update(businessPartners)
    .set({
      deletedAt: new Date(),            // 🗑️ Marca timestamp
      updatedBy: ctx.userId,            // 📊 Auditoria: quem deletou
      updatedAt: new Date(),
      version: current.version + 1,     // 🔒 Incrementa versão
      status: "INACTIVE",
    })
    .where(
      and(
        eq(businessPartners.id, id),
        eq(businessPartners.organizationId, ctx.organizationId)
      )
    )
    .returning();

  return NextResponse.json({
    message: "Excluído com sucesso.",
    data: deleted,
  });
}
```

---

## 🏢 4. Data Scoping (Filiais)

### **Aplicação em GET (Listagem):**

```typescript
export async function GET(request: NextRequest) {
  const ctx = await getTenantContext();

  let query = db
    .select()
    .from(branches)
    .where(
      and(
        eq(branches.organizationId, ctx.organizationId),
        isNull(branches.deletedAt)
      )
    );

  // 🏢 DATA SCOPING: Se não for ADMIN, filtra por filiais permitidas
  if (!ctx.isAdmin && ctx.allowedBranches.length > 0) {
    query = query.where(
      and(
        eq(branches.organizationId, ctx.organizationId),
        isNull(branches.deletedAt),
        inArray(branches.id, ctx.allowedBranches) // Filtra apenas permitidas
      )
    ) as any;
  } else if (!ctx.isAdmin && ctx.allowedBranches.length === 0) {
    // Sem filiais = sem acesso
    return NextResponse.json({ data: [], total: 0 });
  }

  const branchesList = await query;
  return NextResponse.json({ data: branchesList });
}
```

### **Aplicação em GET by ID:**

```typescript
const [branch] = await db.select().from(branches).where(...);

if (!branch) {
  return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
}

// 🏢 Valida acesso à filial
if (!ctx.isAdmin && !ctx.allowedBranches.includes(branch.id)) {
  return NextResponse.json(
    { error: "Você não tem permissão para acessar esta filial." },
    { status: 403 }
  );
}
```

---

## 📋 Checklist de Segurança

### **Para TODA API de CRUD:**

#### **GET (Listagem):**
- [ ] Chamar `getTenantContext()` no início
- [ ] Filtrar por `eq(table.organizationId, ctx.organizationId)`
- [ ] Filtrar por `isNull(table.deletedAt)`
- [ ] Se aplicável, aplicar Data Scoping (filiais)

#### **GET by ID:**
- [ ] Chamar `getTenantContext()` no início
- [ ] Validar ID (parseInt e isNaN)
- [ ] Filtrar por `id + organizationId + deleted_at`
- [ ] Retornar 404 se não encontrado
- [ ] Se aplicável, validar acesso à filial

#### **POST:**
- [ ] Chamar `getTenantContext()` no início
- [ ] Validar dados com Zod schema
- [ ] Verificar duplicidade dentro da organização
- [ ] **INJETAR** `organizationId: ctx.organizationId` (não confiar no front)
- [ ] Incluir `createdBy`, `updatedBy`, `version: 1`

#### **PUT:**
- [ ] Chamar `getTenantContext()` no início
- [ ] Validar ID
- [ ] Buscar registro com `id + organizationId + deleted_at`
- [ ] Validar versão (Optimistic Lock)
- [ ] Verificar duplicidade (se atualizar campo único)
- [ ] Incluir `updatedBy`, `updatedAt`, `version + 1`
- [ ] Double-check de versão no WHERE

#### **DELETE:**
- [ ] Chamar `getTenantContext()` no início
- [ ] Validar ID
- [ ] Buscar registro com `id + organizationId + deleted_at`
- [ ] **SOFT DELETE**: Atualizar `deletedAt`, não usar `db.delete()`
- [ ] Incluir `updatedBy`, `version + 1`, `status: INACTIVE`

---

## 🔍 Teste de Segurança

### **Cenários a Testar:**

1. **Isolamento Multi-Tenant:**
   - ✅ Usuário da Org 1 **NÃO** vê dados da Org 2
   - ✅ Criar registro injeta `organizationId` correto

2. **Soft Delete:**
   - ✅ DELETE não remove fisicamente
   - ✅ GET não retorna registros com `deleted_at` preenchido
   - ✅ GET by ID retorna 404 para deletados

3. **Optimistic Lock:**
   - ✅ PUT com versão desatualizada retorna 409
   - ✅ Versão incrementa a cada update

4. **Auditoria:**
   - ✅ `created_by` preenchido ao criar
   - ✅ `updated_by` preenchido ao atualizar/deletar

5. **Data Scoping:**
   - ✅ Usuário não-admin só vê filiais em `allowedBranches`
   - ✅ Admin vê todas as filiais da organização

---

## 🚀 Status da Implementação

| Componente | Status |
|------------|--------|
| ✅ Session Estendida | **Completo** |
| ✅ getTenantContext() | **Completo** |
| ✅ API Branches (CRUD) | **Completo** |
| ✅ API Business Partners (CRUD) | **Completo** |
| ✅ Multi-Tenant Filtering | **Completo** |
| ✅ Soft Delete | **Completo** |
| ✅ Optimistic Lock | **Completo** |
| ✅ Auditoria (created_by/updated_by) | **Completo** |
| ✅ Data Scoping | **Completo** |
| ⏳ Frontend (Tratamento de erros) | **Pendente** |
| ⏳ Frontend (Lixeira) | **Pendente** |

---

## 📁 Arquivos Criados/Atualizados

```
src/lib/auth/
├── context.ts (🆕 NOVO - Helper de Tenant Context)
└── auth.ts (✅ Atualizado - Session callbacks)

src/types/
└── next-auth.d.ts (🆕 NOVO - Tipos estendidos)

src/app/api/
├── branches/
│   ├── route.ts (🔥 REESCRITO - Segurança completa)
│   └── [id]/route.ts (🔥 REESCRITO - Segurança completa)
└── business-partners/
    ├── route.ts (🔥 REESCRITO - Segurança completa)
    └── [id]/route.ts (🔥 REESCRITO - Segurança completa)

docs/
└── SECURITY_LAYER.md (🆕 NOVO - Este documento)
```

---

**🎉 Camada de Segurança SaaS 100% Implementada!**

**Garantias:**
- ✅ Zero vazamento de dados entre tenants
- ✅ Auditoria completa de todas as operações
- ✅ Controle de concorrência (sem race conditions)
- ✅ Soft Delete (recuperação de dados)
- ✅ Data Scoping (controle por filial)

**Desenvolvido para AuraCore SaaS**  
Versão: 5.0.0 (Security Layer)  
Data: Dezembro/2024




