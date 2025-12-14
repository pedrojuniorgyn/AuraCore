# 🏢 AuraCore - Data Scoping por Filial

## 📋 Visão Geral

Além do **Multi-Tenant** (isolamento por organização), o AuraCore implementa **Data Scoping por Filial**, permitindo controlar quais filiais cada usuário pode acessar dentro da sua organização.

---

## 🎯 Casos de Uso

### **Cenário 1: Gerente Regional**
Um gerente que administra apenas as filiais de São Paulo:
- Pode ver dados de: Filial SP Centro, Filial SP Zona Leste
- **NÃO** pode ver: Filial Rio de Janeiro, Filial Campinas

### **Cenário 2: Operador de Filial**
Um operador que trabalha apenas na Filial de Campinas:
- Pode ver dados **apenas** da Filial Campinas
- Filial padrão ao logar: Campinas

### **Cenário 3: Diretor (Admin)**
Um diretor com acesso total:
- **Role**: ADMIN
- Pode ver **todas** as filiais da organização
- Não precisa de restrição em `user_branches`

---

## 🗂️ Estrutura de Dados

### **1. Tabela `users` (Atualizada)**

```typescript
export const users = mssqlTable("users", {
  // ... campos existentes
  defaultBranchId: int("default_branch_id")
    .references(() => branches.id), // NULLABLE - Filial padrão ao logar
});
```

**Campo `defaultBranchId`:**
- Define qual filial carrega automaticamente ao fazer login
- **NULLABLE**: Se NULL, carrega a primeira filial permitida
- Deve estar presente na lista de `user_branches` do usuário

---

### **2. Tabela `user_branches` (Pivot - N-N)**

Controla **quais filiais** cada usuário pode acessar.

```typescript
export const userBranches = mssqlTable("user_branches", {
  userId: nvarchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  branchId: int("branch_id")
    .notNull()
    .references(() => branches.id, { onDelete: "cascade" }),
  createdAt: datetime2("created_at").default(new Date()),
}, (t) => ([
  primaryKey({ columns: [t.userId, t.branchId] }),
]));
```

**Chave Composta:** `(userId, branchId)` - Garante unicidade

**Regras:**
- Se `user_branches` está **vazio** para um usuário:
  - **ADMIN**: Acesso a **todas** as filiais da organização
  - **USER/Outros**: Acesso **negado** (ou apenas à `defaultBranchId`)

- Se `user_branches` possui registros:
  - Usuário acessa **apenas** as filiais listadas

---

## 🔐 Lógica de Query (Implementação Futura)

### **Exemplo: Listar Branches com Data Scoping**

```typescript
// src/app/api/branches/route.ts
export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session.user.id;
  const organizationId = session.user.organizationId;
  const userRole = session.user.role;

  // 1️⃣ Filtro Multi-Tenant (SEMPRE)
  let query = db
    .select()
    .from(branches)
    .where(eq(branches.organizationId, organizationId));

  // 2️⃣ Data Scoping por Filial
  if (userRole !== "ADMIN") {
    // Busca filiais permitidas para o usuário
    const allowedBranches = await db
      .select({ branchId: userBranches.branchId })
      .from(userBranches)
      .where(eq(userBranches.userId, userId));

    if (allowedBranches.length > 0) {
      const branchIds = allowedBranches.map((b) => b.branchId);
      
      // Filtra apenas filiais permitidas
      query = query.where(
        inArray(branches.id, branchIds)
      ) as any;
    } else {
      // Se não tem filiais permitidas e não é ADMIN, retorna vazio
      return NextResponse.json({ data: [], total: 0 });
    }
  }

  const branchesList = await query;

  return NextResponse.json({
    data: branchesList,
    total: branchesList.length,
  });
}
```

---

## 🌱 Seed - Exemplo de Vinculação

O seed agora cria automaticamente:

```typescript
// 1. Cria Branch Matriz (ID 1)
const matrizBranchId = 1;

// 2. Cria Usuário Admin
const adminId = crypto.randomUUID();
await db.insert(users).values({
  id: adminId,
  organizationId: 1,
  role: "ADMIN",
  defaultBranchId: matrizBranchId, // 🏢 Filial padrão
  // ... outros campos
});

// 3. Vincula Admin à Matriz
await db.insert(userBranches).values({
  userId: adminId,
  branchId: matrizBranchId,
});
```

---

## 📊 Exemplos Práticos

### **Exemplo 1: Usuário com 3 Filiais**

**Dados:**
```sql
-- Usuário
user_id: "abc-123"
default_branch_id: 2
role: "USER"

-- user_branches
(abc-123, 1) -- Filial Matriz
(abc-123, 2) -- Filial SP
(abc-123, 5) -- Filial Campinas
```

**Comportamento:**
- Ao logar: Carrega automaticamente **Filial SP** (ID 2)
- Pode trocar para: Matriz (1) ou Campinas (5)
- **NÃO** pode acessar: Filiais 3, 4, 6, etc.

---

### **Exemplo 2: Admin sem Restrições**

**Dados:**
```sql
-- Usuário
user_id: "def-456"
default_branch_id: 1
role: "ADMIN"

-- user_branches
(vazio)
```

**Comportamento:**
- Ao logar: Carrega **Filial Matriz** (ID 1)
- Pode trocar para: **QUALQUER** filial da organização
- Query: Ignora filtro de `user_branches`, aplica apenas `organization_id`

---

### **Exemplo 3: Operador de Filial Única**

**Dados:**
```sql
-- Usuário
user_id: "ghi-789"
default_branch_id: 3
role: "OPERATOR"

-- user_branches
(ghi-789, 3) -- Apenas Filial RJ
```

**Comportamento:**
- Ao logar: Carrega **Filial RJ** (ID 3)
- **NÃO** pode trocar de filial (apenas 1 disponível)
- Vê apenas dados da Filial RJ

---

## 🎨 Frontend - Seletor de Filial

### **Componente Necessário: BranchSelector**

```tsx
// src/components/branch-selector.tsx
export function BranchSelector() {
  const { user } = useAuth();
  const [currentBranch, setCurrentBranch] = useState(user.defaultBranchId);

  // Busca filiais permitidas
  const { data: branches } = useSWR('/api/branches', fetcher);

  return (
    <Select value={currentBranch} onValueChange={setCurrentBranch}>
      {branches.map((branch) => (
        <SelectItem key={branch.id} value={branch.id}>
          {branch.tradeName}
        </SelectItem>
      ))}
    </Select>
  );
}
```

**Onde usar:**
- Header/Navbar (sempre visível)
- Ao trocar, recarrega dados da tela atual

---

## 🔄 Fluxo de Login com Data Scoping

```
1. Usuário faz login
   ↓
2. Auth retorna:
   - organizationId (Multi-Tenant)
   - defaultBranchId (Filial Padrão)
   - allowedBranches[] (Lista de IDs permitidos)
   ↓
3. Frontend carrega dados da defaultBranchId
   ↓
4. Usuário pode trocar para outra filial (se tiver mais de 1)
   ↓
5. Todas as queries filtram por:
   - organizationId (Multi-Tenant)
   - currentBranchId (Data Scoping)
```

---

## 🛠️ API Helper (Futuro)

### **Utilitário: `getAccessibleBranches()`**

```typescript
// src/lib/utils/data-scoping.ts
export async function getAccessibleBranches(userId: string, role: string) {
  if (role === "ADMIN") {
    // Admin vê todas as filiais da organização
    return await db.select().from(branches);
  }

  // Outros usuários: apenas filiais permitidas
  const userBranchesData = await db
    .select({ branchId: userBranches.branchId })
    .from(userBranches)
    .where(eq(userBranches.userId, userId));

  if (userBranchesData.length === 0) {
    return []; // Sem acesso
  }

  const branchIds = userBranchesData.map((ub) => ub.branchId);
  
  return await db
    .select()
    .from(branches)
    .where(inArray(branches.id, branchIds));
}
```

---

## 📋 Regras de Negócio

### **Criação de Usuário**
1. `defaultBranchId` deve estar em `user_branches`
2. Se `role === "ADMIN"`, `user_branches` pode estar vazio

### **Atualização de Filial Padrão**
1. Validar se a nova `defaultBranchId` está em `user_branches`
2. Se não estiver, retornar erro 400

### **Exclusão de Filial**
1. Se algum usuário tem apenas essa filial, bloquear exclusão
2. Ou remover vínculo e atualizar `defaultBranchId` para NULL

### **Queries**
1. **SEMPRE** filtrar por `organizationId` (Multi-Tenant)
2. Se `role !== "ADMIN"`, filtrar por `user_branches`

---

## 🔐 Validações de Segurança

### **Checklist de Segurança:**

✅ Usuário só pode ver filiais vinculadas a ele  
✅ Usuário só pode criar dados em filiais permitidas  
✅ Usuário só pode editar dados de filiais permitidas  
✅ Admin vê todas as filiais da **SUA organização** (não de outras orgs)  
✅ `defaultBranchId` sempre validado contra `user_branches`  

---

## 🚀 Próximos Passos

### **Backend:**
- [ ] Criar API para gerenciar `user_branches` (vincular/desvincular)
- [ ] Implementar helper `getAccessibleBranches()`
- [ ] Atualizar todas as APIs para usar Data Scoping
- [ ] Validar `defaultBranchId` ao criar/atualizar usuário

### **Frontend:**
- [ ] Componente `BranchSelector` no header
- [ ] Context `CurrentBranchContext`
- [ ] Filtro automático por filial em todas as listagens
- [ ] Indicador visual da filial ativa

---

## 📊 Diagrama de Relacionamentos

```
organizations (1) ──┬─ (N) branches
                    └─ (N) users
                          │
                          │ default_branch_id (FK)
                          ↓
                       branches
                          ↑
                          │
                    user_branches (N-N)
                    (Filiais permitidas)
```

---

**🎉 Data Scoping por Filial implementado!**

O sistema agora suporta:
- ✅ Multi-Tenant (isolamento por organização)
- ✅ Data Scoping (isolamento por filial dentro da organização)

**Desenvolvido para AuraCore SaaS**  
Versão: 3.1.0 (Multi-Tenant + Data Scoping)  
Data: Dezembro/2024



















