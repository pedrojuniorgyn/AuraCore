# 🐛 BUG FIX: Invalid column name 'userId'

## ❌ Erro Original

```
GET https://tcl.auracore.cloud/api/admin/users
Status: 500 Internal Server Error

{
  "error": "Internal Server Error",
  "message": "Invalid column name 'userId'."
}
```

---

## 🔍 Causa Raiz

**Mismatch entre schema Drizzle e banco SQL Server:**

- **Schema Drizzle** (código): usava `camelCase` para nomes de colunas
- **Banco SQL Server** (real): tem `snake_case` para nomes de colunas

### Tabelas Afetadas:

| Tabela | Coluna (Schema Drizzle) | Coluna (Banco Real) |
|--------|------------------------|---------------------|
| `accounts` | `userId` ❌ | `user_id` ✅ |
| `accounts` | `providerAccountId` ❌ | `provider_account_id` ✅ |
| `sessions` | `userId` ❌ | `user_id` ✅ |
| `sessions` | `sessionToken` ❌ | `session_token` ✅ |

---

## ✅ Solução Aplicada

**Arquivo:** `src/lib/db/schema.ts`

### Mudanças:

```diff
// Tabela accounts
export const accounts = mssqlTable("accounts", {
-  userId: nvarchar("userId", { length: 255 })
+  userId: nvarchar("user_id", { length: 255 })
     .notNull()
     .references(() => users.id, { onDelete: "cascade" }),
   
-  providerAccountId: nvarchar("providerAccountId", { length: 255 }).notNull(),
+  providerAccountId: nvarchar("provider_account_id", { length: 255 }).notNull(),
   
   // ... resto do schema
});

// Tabela sessions
export const sessions = mssqlTable("sessions", {
-  sessionToken: nvarchar("sessionToken", { length: 255 }).primaryKey(),
+  sessionToken: nvarchar("session_token", { length: 255 }).primaryKey(),
   
-  userId: nvarchar("userId", { length: 255 })
+  userId: nvarchar("user_id", { length: 255 })
     .notNull()
     .references(() => users.id, { onDelete: "cascade" }),
   
   expires: datetime2("expires", { precision: 3 }).notNull(),
});
```

---

## 📦 Deploy

**Commit:** `34c41476`  
**Branch:** `main`  
**Status:** ✅ Push realizado  
**Deploy:** 🟡 Em andamento (Coolify auto-deploy)

---

## 🧪 Validação

### Aguardar Rebuild (3-5 minutos)

```bash
# Verificar logs do deploy
ssh root@coolify.auracore.cloud
docker logs web-zksk8s0kk08sksgwggkos0gw-* --tail 50 --follow
```

### Testar Endpoint Após Deploy

```bash
# Deve retornar 200 OK com lista de usuários
curl https://tcl.auracore.cloud/api/admin/users

# Resposta esperada:
# {
#   "success": true,
#   "users": [...],
#   "total": N
# }
```

### Testar no Frontend

```
1. Acesse: https://tcl.auracore.cloud/admin/users
2. A lista de usuários deve carregar
3. O contador "Usuários Ativos" deve mostrar o número real
4. Não deve mais aparecer erro 500
```

---

## 📊 Impacto do Bug

**APIs Afetadas:**
- ✅ `/api/admin/users` (GET) - Lista usuários
- ✅ Qualquer endpoint que faça JOIN com `accounts`
- ✅ Autenticação via Google (OAuth) - usa tabela `accounts`
- ✅ Sessões do NextAuth - usa tabela `sessions`

**Páginas Afetadas:**
- ✅ `/admin/users` - Gerenciamento de usuários
- ✅ Login via Google (OAuth flow)
- ✅ Sessões de usuário autenticado

---

## 🎓 Lição Aprendida

**L017 - Schema Naming Consistency:**

> Sempre mapear nomes de colunas Drizzle para o naming convention do banco.
> SQL Server = snake_case → usar strings snake_case no schema Drizzle.

**Padrão Correto:**
```typescript
// ✅ CORRETO: Property camelCase → Coluna snake_case
userId: nvarchar("user_id", { length: 255 })
defaultBranchId: int("default_branch_id")
organizationId: int("organization_id")

// ❌ ERRADO: Property e coluna ambos camelCase
userId: nvarchar("userId", { length: 255 })
```

---

## 📝 Checklist Pós-Deploy

- [ ] Aguardar 3-5 minutos (rebuild do Coolify)
- [ ] Testar `curl https://tcl.auracore.cloud/api/admin/users`
- [ ] Acessar `/admin/users` no navegador
- [ ] Verificar se lista de usuários carrega
- [ ] Verificar contador "Usuários Ativos"
- [ ] Testar login via Google (se aplicável)
- [ ] Marcar BUG-001 como RESOLVIDO

---

## 🔗 Referências

- **Commit:** 34c41476
- **Issue:** BUG-001
- **Arquivo:** `src/lib/db/schema.ts`
- **Deploy:** Coolify auto-deploy via git push

---

**Status:** ✅ Correção aplicada | 🟡 Deploy em andamento | ⏳ Aguardando validação
