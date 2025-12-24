# Domínio — Tenancy + Branch scoping (padrão AuraCore)

## 1) Objetivo
Eliminar uma classe inteira de bugs onde:
- o frontend “esquece” de enviar `x-branch-id` e a API quebra (500) ou faz scoping errado
- endpoints aceitam `branchId` pelo body e permitem “troca de filial” indevida
- há fallback silencioso para filial `1`

Este documento consolida o padrão aprovado:
- **filial ativa via cookie HttpOnly**
- **middleware injeta `x-branch-id` em `/api/**`**
- **helper backend `resolveBranchIdOrThrow`**
- **política de writes: header manda, body não decide filial**

Referência de contrato: `docs/architecture/contracts/TENANT_BRANCH_CONTRACT.md`.

---

## 2) Fonte de verdade do contexto (backend)
O backend deve sempre operar com:
- `organizationId` e `userId` vindos do `getTenantContext()` (sessão NextAuth)
- `branchId` resolvido/validado a partir de `x-branch-id` (ou defaultBranchId do token), nunca confiando no body

---

## 3) Padrão: filial ativa via cookie (HttpOnly)

### 3.1 Cookie
- Nome: `auracore_branch` (ver `src/lib/tenant/branch-cookie.ts`)
- Tipo: HttpOnly (não acessível por JS), usado pelo middleware para injetar header

### 3.2 Persistência (frontend)
O frontend pode manter UX com `localStorage` (ex.: `auracore:current-branch`), mas a **fonte de injeção** para APIs deve ser o cookie HttpOnly.

Exemplo existente:
- `src/contexts/tenant-context.tsx` faz `POST /api/tenant/branch` (best‑effort) ao selecionar filial.

### 3.3 Limpeza no logout
Regra: ao deslogar, limpar cookie de filial para evitar “vazamento” de filial entre sessões no mesmo browser.

---

## 4) Padrão: middleware injeta `x-branch-id`

### 4.1 Onde aplica
No `middleware.ts` (Edge Runtime):
- aplica em `isApi && !isApiAdmin` (ou seja, `/api/**` exceto `/api/admin/**`)
- se o request não tem `x-branch-id`, tenta:
  1) cookie `auracore_branch`
  2) fallback: `defaultBranchId` presente no token (quando existir)

Implementação existente:
- `middleware.ts` (bloco “Branch scoping (automático)”)

### 4.2 Por que isso é “enterprise”
- reduz risco sistêmico: “esqueci header” vira impossível na prática
- padroniza contexto por request (observável e testável)
- mantém compatibilidade com curl/automação (sem forçar redirects HTML)

---

## 5) Helper: `resolveBranchIdOrThrow` (backend)

### 5.1 Objetivo
Centralizar regra de resolução e validação:
- `x-branch-id` tem prioridade
- fallback (quando permitido): `ctx.defaultBranchId`
- valida acesso com `hasAccessToBranch(ctx, branchId)`
- retorna erro HTTP correto (400/403), não 500

Implementação existente:
- `src/lib/auth/branch.ts`

### 5.2 Regra de ouro (writes)
Para endpoints de **POST/PUT/DELETE** (escrita):
- **branchId vem do header** (injetado pelo middleware)
- o body **não decide** filial
- se o body contiver `branchId`, deve ser ignorado ou rejeitado (400) conforme o endpoint

Anti‑pattern proibido:
- `branchId = body.branchId ?? ctx.defaultBranchId ?? 1`

---

## 6) Contrato de erros (para não “virar 500”)
Referência canônica: `docs/architecture/contracts/ERROR_CONTRACT.md`.

### 6.1 Branch scoping
Erros esperados:
- **400**: `x-branch-id` ausente/ inválido (e sem `defaultBranchId`)
- **403**: usuário sem acesso à filial

### 6.2 Atenção: `NextResponse` dentro de try/catch
Se o helper lançar `NextResponse` e o endpoint tiver `try/catch`, o catch deve preservar o status:
- regra: `if (error instanceof Response) return error;`

---

## 7) Definition of Done (DoD) para novas rotas

### 7.1 Para qualquer rota de negócio
- chamar `getTenantContext()` no início
- filtrar por `organizationId` do contexto em queries

### 7.2 Se a tabela tiver `branchId`
- ler `branchId` via `resolveBranchIdOrThrow(request.headers, ctx)`
- aplicar scoping por filial na query (ou em constraints/joins)
- nunca usar fallback para branch `1`

### 7.3 Writes (POST/PUT/DELETE)
- `branchId` derivado do header (não do body)
- “spread” de body não pode sobrescrever `organizationId/branchId`

---

## 8) Recomendações para novos códigos (opcional)
Para reduzir erro humano em telas novas:
- criar um wrapper `apiFetch()` que:
  - garante `credentials: "include"`
  - padroniza erros (lê JSON quando `res.ok=false`)
  - (opcional) adiciona `x-branch-id` do estado do frontend como redundância

> Mesmo com wrapper, o padrão “de verdade” é: cookie + middleware + validação no backend.

