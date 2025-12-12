# 🏢 AuraCore Enterprise Base Pattern

## 📋 Visão Geral

O **AuraCore** segue um padrão arquitetural rigoroso chamado **"Enterprise Base Pattern"**, que garante:
- 🔐 **Segurança Multi-Tenant**
- 📊 **Auditoria Completa**
- 🔄 **Controle de Concorrência**
- 🗑️ **Recuperação de Dados**
- 🎯 **Rastreabilidade Total**

---

## 🎯 Os 5 Pilares do Enterprise Base

### **1️⃣ Multi-Tenancy (SaaS Isolation)**

**Objetivo:** Isolar dados entre diferentes organizações (clientes SaaS).

**Implementação:**
```typescript
organizationId: int("organization_id")
  .notNull()
  .references(() => organizations.id, { onDelete: "cascade" })
```

**Aplicado em:**
- ✅ `users`
- ✅ `branches`
- ✅ `business_partners`
- ✅ `products`
- ✅ `audit_logs`
- ✅ *(Todas as tabelas de negócio futuras)*

**Exemplo de Query Segura:**
```typescript
// ❌ ERRADO (vazamento de dados entre tenants)
const branches = await db.select().from(branches);

// ✅ CORRETO (isolamento por tenant)
const session = await auth();
const branches = await db
  .select()
  .from(branches)
  .where(eq(branches.organizationId, session.user.organizationId));
```

---

### **2️⃣ Auditoria Granular (Traceability)**

**Objetivo:** Rastrear **quem** criou e **quem** alterou cada registro.

**Implementação:**
```typescript
createdBy: nvarchar("created_by", { length: 255 })
  .references(() => users.id), // Nullable (sistema pode criar)

updatedBy: nvarchar("updated_by", { length: 255 })
  .references(() => users.id), // Quem fez a última alteração
```

**Aplicado em:**
- ✅ `branches`
- ✅ `business_partners`
- ✅ `products`
- ✅ *(Todas as tabelas de negócio futuras)*

**Exemplo de Uso:**
```typescript
// Ao criar
await db.insert(businessPartners).values({
  ...data,
  createdBy: session.user.id, // 🔍 Rastreabilidade
  updatedBy: session.user.id,
});

// Ao atualizar
await db.update(businessPartners)
  .set({
    ...data,
    updatedBy: session.user.id, // 🔍 Quem atualizou
    updatedAt: new Date(),
  })
  .where(eq(businessPartners.id, id));
```

**Benefícios:**
- ✅ Saber quem criou/alterou qualquer registro
- ✅ Compliance (LGPD, SOX)
- ✅ Investigação de erros
- ✅ Histórico de mudanças

---

### **3️⃣ Soft Delete (Data Recovery)**

**Objetivo:** Nunca excluir dados fisicamente, permitindo recuperação.

**Implementação:**
```typescript
deletedAt: datetime2("deleted_at"), // Nullable
```

**Lógica:**
- `deletedAt = NULL` → Registro **ATIVO**
- `deletedAt = '2024-12-05 10:30:00'` → Registro **DELETADO** (na lixeira)

**Aplicado em:**
- ✅ `organizations`
- ✅ `users`
- ✅ `branches`
- ✅ `business_partners`
- ✅ `products`
- ✅ *(Todas as tabelas de negócio futuras)*

**Exemplo de Query:**
```typescript
// Buscar apenas registros ativos
const activePartners = await db
  .select()
  .from(businessPartners)
  .where(
    and(
      eq(businessPartners.organizationId, orgId),
      eq(businessPartners.deletedAt, null as any) // Apenas não deletados
    )
  );

// Buscar registros na lixeira
const deletedPartners = await db
  .select()
  .from(businessPartners)
  .where(
    and(
      eq(businessPartners.organizationId, orgId),
      ne(businessPartners.deletedAt, null as any) // Apenas deletados
    )
  );
```

**Exemplo de Soft Delete:**
```typescript
// ❌ NUNCA faça isso
await db.delete(businessPartners).where(eq(businessPartners.id, id));

// ✅ SEMPRE faça isso
await db.update(businessPartners)
  .set({
    deletedAt: new Date(),
    updatedBy: session.user.id,
    updatedAt: new Date(),
  })
  .where(eq(businessPartners.id, id));
```

**Benefícios:**
- ✅ Recuperação de dados acidentalmente excluídos
- ✅ Histórico completo
- ✅ Compliance (retenção de dados)
- ✅ Lixeira funcional

---

### **4️⃣ Optimistic Locking (Concurrency Control)**

**Objetivo:** Prevenir conflitos de atualização simultânea (race conditions).

**Implementação:**
```typescript
version: int("version").default(1).notNull()
```

**Aplicado em:**
- ✅ `organizations`
- ✅ `branches`
- ✅ `business_partners`
- ✅ `products`
- ✅ *(Todas as tabelas de negócio futuras)*

**Lógica:**
1. Usuário A busca registro (version = 5)
2. Usuário B busca mesmo registro (version = 5)
3. Usuário A atualiza → version vira 6
4. Usuário B tenta atualizar (enviando version = 5) → **BLOQUEADO** (version no banco já é 6)

**Exemplo de Implementação:**
```typescript
// Frontend envia
const updateData = {
  name: "Novo Nome",
  version: 5, // Versão atual que ele tem
};

// Backend valida
const [current] = await db
  .select()
  .from(businessPartners)
  .where(eq(businessPartners.id, id));

if (current.version !== updateData.version) {
  return NextResponse.json(
    {
      error: "Conflito de versão",
      details: "Registro foi alterado por outro usuário. Recarregue e tente novamente.",
    },
    { status: 409 }
  );
}

// Atualiza incrementando a versão
await db.update(businessPartners)
  .set({
    ...updateData,
    version: current.version + 1, // Incrementa
    updatedBy: session.user.id,
    updatedAt: new Date(),
  })
  .where(
    and(
      eq(businessPartners.id, id),
      eq(businessPartners.version, current.version) // Double-check
    )
  );
```

**Benefícios:**
- ✅ Previne perda de dados em edições simultâneas
- ✅ UX melhor (avisa usuário sobre conflito)
- ✅ Integridade de dados

---

### **5️⃣ Timestamps Padrão**

**Objetivo:** Rastrear quando registros foram criados/atualizados.

**Implementação:**
```typescript
createdAt: datetime2("created_at").default(new Date()),
updatedAt: datetime2("updated_at").default(new Date()),
```

**Aplicado em:**
- ✅ **TODAS** as tabelas

**Lógica de Update:**
```typescript
await db.update(businessPartners)
  .set({
    ...data,
    updatedAt: new Date(), // ⏰ Sempre atualiza timestamp
  })
  .where(eq(businessPartners.id, id));
```

---

## 📊 Tabela de Referência

| Pilar | Campo | Tipo | Nullable | Aplicado Em |
|-------|-------|------|----------|-------------|
| Multi-Tenant | `organization_id` | INT | ❌ NOT NULL | Todas as tabelas de negócio |
| Auditoria | `created_by` | NVARCHAR | ✅ NULL | Tabelas de negócio |
| Auditoria | `updated_by` | NVARCHAR | ✅ NULL | Tabelas de negócio |
| Soft Delete | `deleted_at` | DATETIME2 | ✅ NULL | Todas as tabelas |
| Optimistic Lock | `version` | INT | ❌ NOT NULL | Tabelas de negócio |
| Timestamps | `created_at` | DATETIME2 | ❌ NOT NULL | Todas |
| Timestamps | `updated_at` | DATETIME2 | ❌ NOT NULL | Todas |
| Status | `status` | NVARCHAR | ❌ NOT NULL | Todas |

---

## 🛠️ Template de Tabela Enterprise

```typescript
export const myEntity = mssqlTable("my_entity", {
  // === PRIMARY KEY ===
  id: int("id").primaryKey().identity(),
  
  // === MULTI-TENANT ===
  organizationId: int("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  
  // === CAMPOS DE NEGÓCIO ===
  name: nvarchar("name", { length: 255 }).notNull(),
  // ... outros campos específicos da entidade
  
  // === ENTERPRISE BASE ===
  createdBy: nvarchar("created_by", { length: 255 })
    .references(() => users.id),
  updatedBy: nvarchar("updated_by", { length: 255 })
    .references(() => users.id),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"), // Soft Delete
  version: int("version").default(1).notNull(), // Optimistic Locking
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
}, (table) => ([
  // Índices específicos da entidade
]));
```

---

## 🔄 Fluxo de Lifecycle de um Registro

### **Criação:**
```typescript
await db.insert(businessPartners).values({
  organizationId: 1,
  name: "Cliente ABC",
  // ... campos de negócio
  
  // Enterprise Base
  createdBy: userId,      // 👤 Quem criou
  updatedBy: userId,      // 👤 Quem criou (igual)
  createdAt: new Date(),  // ⏰ Quando criou
  updatedAt: new Date(),  // ⏰ Quando criou (igual)
  deletedAt: null,        // 🗑️ Não deletado
  version: 1,             // 🔒 Versão inicial
  status: "ACTIVE",       // ✅ Ativo
});
```

### **Atualização:**
```typescript
const [current] = await db.select().from(businessPartners).where(...);

// Valida versão (Optimistic Lock)
if (current.version !== inputVersion) {
  throw new Error("Conflito de versão");
}

await db.update(businessPartners)
  .set({
    name: "Novo Nome",
    // ... campos atualizados
    
    // Enterprise Base
    updatedBy: userId,           // 👤 Quem atualizou
    updatedAt: new Date(),       // ⏰ Quando atualizou
    version: current.version + 1, // 🔒 Incrementa versão
  })
  .where(
    and(
      eq(businessPartners.id, id),
      eq(businessPartners.version, current.version) // Double-check
    )
  );
```

### **Soft Delete:**
```typescript
await db.update(businessPartners)
  .set({
    deletedAt: new Date(),       // 🗑️ Marca como deletado
    updatedBy: userId,           // 👤 Quem deletou
    updatedAt: new Date(),       // ⏰ Quando deletou
    version: current.version + 1, // 🔒 Incrementa versão
    status: "INACTIVE",          // ✅ Inativa
  })
  .where(eq(businessPartners.id, id));
```

### **Restauração (Undelete):**
```typescript
await db.update(businessPartners)
  .set({
    deletedAt: null,             // 🗑️ Remove flag de deletado
    updatedBy: userId,           // 👤 Quem restaurou
    updatedAt: new Date(),       // ⏰ Quando restaurou
    version: current.version + 1, // 🔒 Incrementa versão
    status: "ACTIVE",            // ✅ Reativa
  })
  .where(eq(businessPartners.id, id));
```

---

## 🔐 Queries Seguras (Padrão Enterprise)

### **Listagem (Apenas Ativos)**
```typescript
const activePartners = await db
  .select()
  .from(businessPartners)
  .where(
    and(
      eq(businessPartners.organizationId, orgId), // Multi-Tenant
      isNull(businessPartners.deletedAt)          // Apenas não deletados
    )
  );
```

### **Busca Individual com Validação de Propriedade**
```typescript
const [partner] = await db
  .select()
  .from(businessPartners)
  .where(
    and(
      eq(businessPartners.id, id),
      eq(businessPartners.organizationId, orgId), // Garante que pertence ao tenant
      isNull(businessPartners.deletedAt)          // Não está deletado
    )
  );

if (!partner) {
  throw new Error("Parceiro não encontrado ou você não tem permissão");
}
```

### **Lixeira (Deletados)**
```typescript
const deletedPartners = await db
  .select()
  .from(businessPartners)
  .where(
    and(
      eq(businessPartners.organizationId, orgId),
      isNotNull(businessPartners.deletedAt) // Apenas deletados
    )
  );
```

---

## 📋 Checklist de Implementação

### **Ao Criar uma Nova Tabela de Negócio:**

- [ ] Adicionar `organization_id` (NOT NULL, FK)
- [ ] Adicionar `created_by` (NULL, FK users)
- [ ] Adicionar `updated_by` (NULL, FK users)
- [ ] Adicionar `created_at` (NOT NULL, default now)
- [ ] Adicionar `updated_at` (NOT NULL, default now)
- [ ] Adicionar `deleted_at` (NULL)
- [ ] Adicionar `version` (NOT NULL, default 1)
- [ ] Adicionar `status` (NOT NULL, default ACTIVE)

### **Ao Criar API de CRUD:**

- [ ] **GET**: Filtrar por `organization_id` + `deleted_at IS NULL`
- [ ] **POST**: Incluir `created_by`, `updated_by`, `version = 1`
- [ ] **PUT**: Validar `version`, incrementar, atualizar `updated_by`
- [ ] **DELETE**: Soft delete (atualizar `deleted_at`)
- [ ] Criar endpoint **RESTORE** (opcional)

---

## 🎯 Benefícios do Enterprise Base

### **Segurança:**
✅ Multi-Tenant garante isolamento total  
✅ Soft Delete previne perda acidental  
✅ Auditoria permite rastreamento completo  

### **Integridade:**
✅ Optimistic Locking previne race conditions  
✅ Foreign Keys garantem consistência  
✅ Timestamps automáticos  

### **Compliance:**
✅ LGPD (direito ao esquecimento via soft delete)  
✅ SOX (rastreabilidade de alterações)  
✅ ISO 27001 (auditoria completa)  

### **Operacional:**
✅ Lixeira funcional  
✅ Histórico de mudanças  
✅ Recuperação de dados  
✅ Investigação de problemas  

---

## 📊 Exemplo Completo: Business Partners

### **Estrutura da Tabela:**
```typescript
export const businessPartners = mssqlTable("business_partners", {
  // Primary Key
  id: int("id").primaryKey().identity(),
  
  // Multi-Tenant
  organizationId: int("organization_id").notNull().references(...),
  
  // Campos de Negócio
  type: nvarchar("type", { length: 20 }).notNull(),
  document: nvarchar("document", { length: 20 }).notNull(),
  name: nvarchar("name", { length: 255 }).notNull(),
  // ... outros campos
  
  // Enterprise Base
  createdBy: nvarchar("created_by", { length: 255 }).references(() => users.id),
  updatedBy: nvarchar("updated_by", { length: 255 }).references(() => users.id),
  createdAt: datetime2("created_at").default(new Date()),
  updatedAt: datetime2("updated_at").default(new Date()),
  deletedAt: datetime2("deleted_at"),
  version: int("version").default(1).notNull(),
  status: nvarchar("status", { length: 20 }).default("ACTIVE"),
});
```

---

## 🚀 Migration Strategy

### **1. Reset do Banco (DEV)**
```bash
npx tsx -r dotenv/config scripts/reset-db.ts
```

### **2. Gerar Migrations**
```bash
npx drizzle-kit generate
```

### **3. Aplicar Migrations**
```bash
npx drizzle-kit migrate
```

### **4. Popular Banco**
```bash
npx tsx -r dotenv/config scripts/seed.ts
```

---

## 📝 Próximos Passos

### **Backend:**
- [ ] Criar middleware `validateVersion()` para Optimistic Locking
- [ ] Criar helper `softDelete()` reutilizável
- [ ] Criar endpoint `POST /api/{entity}/restore` para restaurar deletados
- [ ] Implementar auditoria automática (trigger em updates)

### **Frontend:**
- [ ] Exibir "Quem criou" e "Quando criou" em detalhes
- [ ] Implementar tratamento de conflito de versão (modal de reload)
- [ ] Criar tela de "Lixeira" para cada módulo
- [ ] Botão "Restaurar" para registros deletados

---

## 🏆 Tabelas com Enterprise Base Aplicado

| Tabela | Multi-Tenant | Auditoria | Soft Delete | Optimistic Lock | Status |
|--------|--------------|-----------|-------------|-----------------|--------|
| `organizations` | N/A | ❌ | ✅ | ✅ | ✅ |
| `users` | ✅ | ❌* | ✅ | ❌ | ❌ |
| `branches` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `business_partners` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `products` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `audit_logs` | ✅ | ❌* | ❌ | ❌ | ❌ |

*Auditoria não aplicada em `users` e `audit_logs` pois são metadados.

---

**🎉 Enterprise Base Pattern aplicado em 100% das tabelas de negócio!**

**Desenvolvido para AuraCore SaaS**  
Versão: 4.0.0 (Enterprise Base)  
Data: Dezembro/2024


















