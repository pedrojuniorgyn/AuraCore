# 🛡️ AuraCore - Tratamento Global de Erros e Data Provider

> **Nota de governança (Fonte de verdade):** este documento é complementar/histórico.  
> A especificação canônica do sistema está em `docs/architecture/INDEX.md` e nos Contracts/ADRs.  
> - Índice: `docs/architecture/INDEX.md`  
> - Contracts: `docs/architecture/contracts/*`  
> - ADRs: `docs/architecture/adr/*`

## 📋 Visão Geral

O **AuraCore** implementa um sistema robusto de **tratamento global de erros** e **injeção automática de headers** via um **Data Provider customizado** do Refine.

---

## 🎯 Funcionalidades Implementadas

### **1️⃣ Interceptação Global de Erros**
Todos os erros de API são capturados e tratados automaticamente, exibindo toasts informativos para o usuário.

### **2️⃣ Injeção Automática de Headers**
O `x-branch-id` é injetado automaticamente em **TODAS** as requisições, sincronizando com a filial ativa.

### **3️⃣ Invalidação de Cache ao Trocar Filial**
Ao mudar de filial, **TODOS** os dados em cache são invalidados, garantindo que não haja dados desatualizados.

### **4️⃣ Toast Notifications Contextuais**
Cada tipo de erro exibe uma mensagem específica e ações automáticas (redirect, reload, etc.).

---

## 🔐 Tratamento de Erros (Por Status Code)

### **401 - Não Autenticado**
```typescript
// O que acontece:
1. Toast: "Sessão expirada. Redirecionando para login..."
2. Aguarda 1s (usuário vê o toast)
3. Executa signOut() com redirect para /login
```

**Casos de Uso:**
- Token JWT expirou
- Usuário foi deslogado em outra aba
- Sessão invalidada pelo servidor

---

### **403 - Sem Permissão**
```typescript
// O que acontece:
1. Toast de Erro: "Você não tem permissão para realizar esta ação."
2. Descrição: "Entre em contato com o administrador..."
3. Operação bloqueada (não executa)
```

**Casos de Uso:**
- Usuário tentou acessar filial sem permissão
- Usuário tentou deletar Matriz (ID 1)
- Operação requer role ADMIN

---

### **409 - Conflito (Optimistic Lock)**
```typescript
// O que acontece:
1. Toast de Erro: "Conflito de versão detectado!"
2. Descrição: "Registro foi alterado por outro usuário. Recarregando..."
3. Aguarda 2s
4. Recarrega a página (window.location.reload())
```

**Casos de Uso:**
- Usuário A e B editam o mesmo registro simultaneamente
- A versão enviada não bate com a do banco
- Backend retorna `code: "VERSION_CONFLICT"`

**Detecção:**
```typescript
const isVersionConflict =
  errorData?.code === "VERSION_CONFLICT" ||
  errorMessage?.includes("versão") ||
  errorMessage?.includes("alterado por outro usuário");
```

---

### **404 - Não Encontrado**
```typescript
// O que acontece:
1. Toast de Erro: "Recurso não encontrado"
2. Descrição: "O registro não existe ou foi removido."
```

**Casos de Uso:**
- Registro foi soft-deleted
- ID inválido
- Recurso de outra organização

---

### **400 - Erro de Validação**
```typescript
// O que acontece:
1. Toast de Erro: "Erro de validação"
2. Descrição: Primeira mensagem de erro do Zod
3. Exemplo: "CNPJ inválido (apenas números, 14 dígitos)"
```

**Casos de Uso:**
- Dados enviados não passaram no Zod schema
- Campos obrigatórios ausentes
- Formato inválido

---

### **500 - Erro Interno**
```typescript
// O que acontece:
1. Toast de Erro: "Erro interno do servidor"
2. Descrição: "Algo deu errado. Tente novamente mais tarde."
```

**Casos de Uso:**
- Erro no código do backend
- Falha de conexão com banco
- Timeout de query

---

### **Erro de Rede (sem resposta)**
```typescript
// O que acontece:
1. Toast de Erro: "Erro de conexão"
2. Descrição: "Não foi possível conectar ao servidor. Verifique sua internet."
```

**Casos de Uso:**
- Internet caiu
- Servidor está offline
- Timeout de rede

---

## 📡 Injeção Automática de Headers

### **Request Interceptor:**

Todos os requests do Axios passam por este interceptor:

```typescript
httpClient.interceptors.request.use((config) => {
  // 1️⃣ Injeta x-branch-id (Filial Ativa)
  const currentBranchId = localStorage.getItem("auracore:current-branch");
  if (currentBranchId) {
    config.headers["x-branch-id"] = currentBranchId;
  }

  // 2️⃣ Adiciona timestamp (evita cache)
  config.headers["x-request-time"] = new Date().toISOString();

  console.log(`📡 API Request: ${config.method} ${config.url}`, {
    branchId: currentBranchId,
  });

  return config;
});
```

### **Uso no Backend (Futuro):**

```typescript
// src/app/api/products/route.ts
export async function GET(request: NextRequest) {
  const ctx = await getTenantContext();
  
  // Pega filial ativa do header (enviado automaticamente pelo frontend)
  const branchId = request.headers.get("x-branch-id");
  
  const products = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.organizationId, ctx.organizationId),
        branchId ? eq(products.branchId, parseInt(branchId)) : undefined
      )
    );
}
```

---

## 🔄 Invalidação de Cache ao Trocar Filial

### **Fluxo Completo:**

```
1. Usuário clica em outra filial
   ↓
2. BranchSwitcher chama invalidate({ invalidates: ["all"] })
   ↓
3. Refine limpa TODOS os dados em cache
   ↓
4. switchBranch() atualiza contexto e localStorage
   ↓
5. router.refresh() recarrega a página
   ↓
6. Novas queries buscam dados da nova filial
   ↓
7. Toast de sucesso: "Filial alterada: SP Centro"
```

### **Código:**

```typescript
const invalidate = useInvalidate();

const handleBranchSwitch = async (branchId: number) => {
  // Invalida cache ANTES de trocar
  invalidate({ invalidates: ["all"] });
  
  // Troca de filial
  await switchBranch(branchId);
  
  // Recarrega página
  // (router.refresh() já é chamado dentro de switchBranch)
};
```

---

## 📊 Data Provider Customizado

### **Estrutura:**

```typescript
export const dataProvider = (apiUrl: string): DataProvider => ({
  getList: async ({ resource, pagination, filters, sorters }) => {
    // GET /api/{resource}
    // Retorna { data: [...], total: 100 }
  },

  getOne: async ({ resource, id }) => {
    // GET /api/{resource}/{id}
    // Retorna { data: {...} }
  },

  create: async ({ resource, variables }) => {
    // POST /api/{resource}
    // Toast: "Registro criado com sucesso!"
  },

  update: async ({ resource, id, variables }) => {
    // PUT /api/{resource}/{id}
    // Toast: "Registro atualizado com sucesso!"
  },

  deleteOne: async ({ resource, id }) => {
    // DELETE /api/{resource}/{id}
    // Toast: "Registro excluído com sucesso!"
  },
});
```

### **Vantagens:**

✅ **Toasts Automáticos** em operações de sucesso  
✅ **Erros Interceptados** globalmente  
✅ **Headers Injetados** automaticamente  
✅ **Compatível** com Refine hooks (`useList`, `useCreate`, etc.)  

---

## 🎨 Exemplo de Uso em Páginas

### **Listagem com Refine:**

```typescript
"use client";

import { useList } from "@refinedev/core";
import { useTenant } from "@/contexts/tenant-context";

export default function BusinessPartnersPage() {
  const { currentBranch } = useTenant();
  
  const { data, isLoading, error } = useList({
    resource: "business-partners",
    filters: [
      {
        field: "status",
        operator: "eq",
        value: "ACTIVE",
      },
    ],
  });

  // Erros são tratados automaticamente (toast + redirect)
  // x-branch-id é injetado automaticamente no header

  return (
    <div>
      <h1>Parceiros de Negócio - {currentBranch?.tradeName}</h1>
      {isLoading && <p>Carregando...</p>}
      {data?.data.map((partner) => (
        <div key={partner.id}>{partner.name}</div>
      ))}
    </div>
  );
}
```

### **Criação com Refine:**

```typescript
import { useCreate } from "@refinedev/core";

export function CreatePartnerForm() {
  const { mutate: create, isLoading } = useCreate();

  const handleSubmit = (values: any) => {
    create({
      resource: "business-partners",
      values,
      // Toast de sucesso automático
      // Erro 400 (validação) exibe toast de erro
      // organization_id injetado automaticamente pelo backend
    });
  };
}
```

---

## 🔍 Logs de Debugging

### **Cada Request Loga:**

```
📡 API Request: GET /api/branches
{
  branchId: "1",
  timestamp: "2024-12-05T12:45:30.123Z"
}
```

### **Cada Erro Loga:**

```
❌ API Error [409]: Conflito de versão
{
  code: "VERSION_CONFLICT",
  currentVersion: 5,
  sentVersion: 4
}
```

---

## 📋 Checklist de Implementação

### **✅ Data Provider:**
- [x] Axios instance configurado
- [x] Request interceptor (headers)
- [x] Response interceptor (erros)
- [x] Métodos CRUD (getList, create, update, delete)
- [x] Toasts de sucesso em operações
- [x] Custom method para requests especiais

### **✅ Error Handling:**
- [x] 401 → signOut + redirect login
- [x] 403 → Toast de erro
- [x] 409 → Toast + reload (Optimistic Lock)
- [x] 404 → Toast de erro
- [x] 400 → Toast com erro de validação Zod
- [x] 500 → Toast de erro genérico
- [x] Erro de rede → Toast de conexão

### **✅ Branch Switching:**
- [x] Invalidação de cache (`invalidate({ invalidates: ["all"] })`)
- [x] Atualização de contexto
- [x] Persistência no localStorage
- [x] Toast de sucesso
- [x] Reload da página

### **✅ Refine Integration:**
- [x] RefineProvider criado
- [x] Recursos definidos (branches, business-partners, products)
- [x] Router provider configurado
- [x] Opções do Refine configuradas

---

## 📁 ARQUIVOS CRIADOS/ATUALIZADOS

```
src/providers/
├── data-provider.ts (🆕 NOVO - 300 linhas)
│   ├─ Axios instance com interceptors
│   ├─ Request interceptor (x-branch-id)
│   ├─ Response interceptor (error handling)
│   └─ Data Provider do Refine
└── refine-provider.tsx (🆕 NOVO - 80 linhas)
    └─ Configuração central do Refine

src/components/layout/
└── branch-switcher.tsx (✅ Atualizado)
    └─ Invalidação de cache ao trocar filial

src/app/
└── providers.tsx (✅ Atualizado)
    └─ RefineProvider adicionado

docs/
└── ERROR_HANDLING.md (🆕 NOVO - Este documento)
```

---

## 🚀 TESTE DE FUNCIONAMENTO

### **Teste 1: Erro 409 (Optimistic Lock)**
```bash
# 1. Edite um parceiro no navegador A (não salve)
# 2. Edite o mesmo parceiro no navegador B e SALVE (version vira 2)
# 3. Salve no navegador A (enviando version = 1)
# 4. Resultado: Toast "Conflito de versão" + reload automático
```

### **Teste 2: Erro 401 (Sessão Expirada)**
```bash
# 1. Faça login
# 2. Espere o JWT expirar (ou delete manualmente do DevTools)
# 3. Tente listar branches
# 4. Resultado: Toast "Sessão expirada" + redirect para /login
```

### **Teste 3: Troca de Filial**
```bash
# 1. Faça login
# 2. Clique no BranchSwitcher
# 3. Selecione outra filial
# 4. Observe:
#    - Toast "Filial alterada: ..."
#    - Página recarrega
#    - Dados da nova filial são exibidos
```

### **Teste 4: Header x-branch-id**
```bash
# Abra DevTools → Network
# Faça qualquer request (GET /api/branches)
# Verifique Request Headers:
#   x-branch-id: 1
#   x-request-time: 2024-12-05T...
```

---

## 📊 FLUXO COMPLETO DE REQUEST

```
┌────────────────────────────────────────────┐
│  Frontend Component                        │
│  useList({ resource: "branches" })         │
└──────────────┬─────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│  Refine Data Provider                      │
│  dataProvider.getList()                    │
└──────────────┬─────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│  Axios Request Interceptor                 │
│  - Injeta x-branch-id: 1                   │
│  - Injeta x-request-time                   │
└──────────────┬─────────────────────────────┘
               │
┌──────────────▼─────────────────────────────┐
│  API Route (Backend)                       │
│  GET /api/branches                         │
│  - getTenantContext()                      │
│  - Filtra por organization_id              │
│  - Filtra por deleted_at IS NULL           │
└──────────────┬─────────────────────────────┘
               │
        ┌──────┴──────┐
        │   Sucesso   │   Erro
        ▼             ▼
┌───────────────┐  ┌─────────────────────────┐
│  Response OK  │  │  Response Interceptor   │
│  200/201      │  │  - 401 → signOut()      │
│               │  │  - 403 → Toast          │
│               │  │  - 409 → Toast + reload │
│               │  │  - 404/400/500 → Toast  │
└───────────────┘  └─────────────────────────┘
        │                     │
        └──────────┬──────────┘
                   ▼
         ┌─────────────────┐
         │  UI Atualizada  │
         └─────────────────┘
```

---

## 🛠️ Configuração

### **Variável de Ambiente (`.env`):**
```bash
# URL base da API (opcional - padrão: http://localhost:3000/api)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### **LocalStorage Keys:**
```
auracore:current-branch → ID da filial ativa
```

---

## 🎯 Vantagens do Sistema

### **UX (User Experience):**
✅ **Feedback Imediato** - Toasts informativos em todas as operações  
✅ **Sem Dados Desatualizados** - Cache invalidado ao trocar filial  
✅ **Tratamento Inteligente** - Cada erro tem ação específica  
✅ **Loading States** - Skeleton loaders durante carregamento  

### **DX (Developer Experience):**
✅ **Interceptação Automática** - Não precisa tratar erros manualmente  
✅ **Headers Automáticos** - `x-branch-id` injetado sempre  
✅ **Refine Hooks** - useList, useCreate, useUpdate prontos  
✅ **Logs Detalhados** - Console logs de todos os requests  

### **Segurança:**
✅ **Auto-Logout** em 401  
✅ **Bloqueio** em 403  
✅ **Prevenção de Conflitos** em 409  
✅ **Validação** em 400  

---

## 🚀 Status da Implementação

| Componente | Status |
|------------|--------|
| ✅ Data Provider | **100% Completo** |
| ✅ Axios Interceptors | **100% Completo** |
| ✅ Error Handling (401) | **100% Completo** |
| ✅ Error Handling (403) | **100% Completo** |
| ✅ Error Handling (409) | **100% Completo** |
| ✅ Error Handling (404) | **100% Completo** |
| ✅ Error Handling (400) | **100% Completo** |
| ✅ Error Handling (500) | **100% Completo** |
| ✅ Header x-branch-id | **100% Injetado** |
| ✅ Cache Invalidation | **100% Funcional** |
| ✅ Refine Integration | **100% Completo** |
| ✅ Toast Notifications | **100% Funcional** |

---

**🎉 Frontend 100% Blindado contra Erros de API!**

**Desenvolvido para AuraCore SaaS**  
Versão: 6.0.0 (Error Handling + Refine Integration)  
Data: Dezembro/2024



















