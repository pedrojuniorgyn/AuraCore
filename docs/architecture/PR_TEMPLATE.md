# Template de Pull Request — AuraCore Enterprise

## Contexto
- **Domínio**: (Financeiro / Contábil / Admin / TMS / WMS / Fiscal / Integrações / Infra)
- **Tipo de mudança**: (Bugfix / Feature / Refactor / Migração / Operação / Segurança)
- **Tipo de endpoint afetado**:
  - [ ] **A) Produto (UI)**
  - [ ] **B) Operacional (Admin/Job)**
  - [ ] **C) Público (Webhook/Health)**
  - [ ] Não aplica

## O que muda (resumo)
- 
- 
- 

## Segurança & Escopo (obrigatório)
- **Autenticação**
  - [ ] Usa `getTenantContext()` (preferencial) ou equivalente
  - [ ] 401/403 padronizados

- **Multi-tenant**
  - [ ] Toda query de negócio filtra por `organizationId` do contexto
  - [ ] Nunca confia em `organizationId` vindo do body/query

- **Branch scoping** (se existir `branchId` no dado)
  - [ ] Backend valida `branchId ∈ allowedBranches` (exceto admin)
  - [ ] Não há fallback silencioso para filial “1”

- **RBAC**
  - [ ] Operações sensíveis usam `withPermission(...)`
  - [ ] Permissão usada é específica (não genérica demais)

## Integridade & Consistência (obrigatório)
- **Transação**
  - [ ] Fluxos multi-step de escrita são atômicos (commit/rollback)

- **Optimistic lock**
  - [ ] Updates relevantes validam `version`
  - [ ] Conflito retorna 409 com `code: "VERSION_CONFLICT"`

- **Auditoria**
  - [ ] `createdBy/updatedBy/...` usam **UUID string**
  - [ ] Não existe `parseInt(session.user.id)` no código alterado

## SQL Server 2022 & Performance (obrigatório)
- [ ] Sem `.returning()` em código de produção
- [ ] Listagens não fazem `select` total + `.slice()` para paginação
- [ ] Sem SQL interpolado (template string em query). Tudo parametrizado
- [ ] Estratégia de índice/paginação revisada para endpoints de volume

## Regras por tipo de endpoint
### A) Produto (UI)
- [ ] Input validado (Zod `safeParse`) para POST/PUT/PATCH
- [ ] Respostas de erro seguem padrão (400/401/403/404/409/500)

### B) Operacional (Admin/Job)
- [ ] Requer permissão forte (ex.: `admin.full` / `admin.migrations.run`)
- [ ] Hard gate adicional (segredo operacional/header)
- [ ] Bloqueado por ambiente (produção desabilita por padrão)
- [ ] Logado: “quem rodou / quando / o quê”

### C) Público (Webhook/Health)
- [ ] Webhook valida assinatura/origem
- [ ] Webhook é idempotente (event id)
- [ ] Webhook usa transação para efeitos múltiplos

## Test plan (obrigatório)
- [ ] Teste manual principal:
- [ ] Teste de permissão (403 esperado):
- [ ] Teste multi-tenant (não vaza dados):
- [ ] Teste de concorrência (quando aplicável):

## Riscos & Rollback
- **Risco**: (baixo/médio/alto) — por quê?
- **Rollback**: como desfazer (feature flag, migration down, revert PR, etc.)
