# Contract — Definition of Done (DoD) único

## 1) Objetivo
Padronizar o “pronto para entregar” do AuraCore, reduzindo regressões e garantindo:
- segurança (multi‑tenant + branch scoping + RBAC)
- consistência (transações, idempotência, optimistic lock)
- operação (observabilidade e runbooks)
- performance (SQL Server‑first)

Este DoD complementa (não substitui) os contracts:
- `API_CONTRACT.md`
- `TENANT_BRANCH_CONTRACT.md`
- `RBAC_CONTRACT.md`
- `ERROR_CONTRACT.md`
- `TRANSACTIONS_CONTRACT.md`
- `SQLSERVER_PERFORMANCE_CONTRACT.md`

---

## 2) DoD — Endpoint API (Route Handler)

### 2.1 Classificar o endpoint
Conforme `API_CONTRACT.md`:
- **A) Produto (UI)**: endpoints de negócio usados pelas telas
- **B) Operacional (Admin/Job)**: endpoints de operação/diagnóstico/seed/migrate
- **C) Público (Webhook/Health)**: healthchecks e webhooks

### 2.2 Checklist obrigatório (A — Produto)
- **Auth + Contexto**: chama `getTenantContext()` no início.
- **Tenancy**: toda query filtra por `organizationId` do contexto (nunca do body/query).
- **Branch scoping (quando aplicável)**:
  - resolve `branchId` via `x-branch-id` + validação (`resolveBranchIdOrThrow`)
  - **proibido** fallback silencioso para filial `1`
- **RBAC**: operações sensíveis exigem permissão explícita (`withPermission`/equivalente).
- **Validação**: payload validado (Zod ou equivalente) e retorna **400** em erro.
- **Erros**: respeita `ERROR_CONTRACT.md` (400/401/403/404/409/503) sem “virar 500”.
- **Transação**: se houver 2+ writes consistentes, usa transação (ADR 0005).
- **Idempotência**: se houver risco de duplicidade (financeiro/integr.):
  - usa idempotência persistida (5B) e status previsível (hit/miss/in_progress).
- **Performance**:
  - paginação no banco (não “select tudo + slice”)
  - evitar `LIKE '%x%'` sem estratégia
  - queries parametrizadas
- **Observabilidade mínima**:
  - logar `requestId`, `organizationId`, `branchId` (quando existir), status e duração

### 2.3 Checklist obrigatório (B — Operacional)
Tudo do tipo A, mais:
- **Hard gate**: permissão forte + segredo operacional quando necessário
- **Ambiente**: operação perigosa OFF em prod por padrão (ADR/runbook)
- **Logs de execução**: quem rodou/quando/o quê (e resultado)
- **Rollback claro**: como desfazer/mitigar (documentado)

### 2.4 Checklist obrigatório (C — Público)
- **Health**: não bloquear deploy com dependências (não tocar DB no healthcheck principal).
- **Webhook**:
  - validação de assinatura/origem
  - idempotência + transação
  - SQL parametrizado

---

## 3) DoD — Tela UI (Dashboard)
- **Autenticação**: tela do produto não renderiza sem sessão (layout protegido).
- **Branch awareness**:
  - UX mostra filial ativa
  - troca de filial invalida cache/refresh sem “vazar dados”
- **Erros**:
  - respeita contrato de erros; exibe mensagem útil (sem stack)
  - 401 deve redirecionar para login (fluxo consistente)
- **Performance**:
  - grids de alto volume devem usar SSRM/paginação server‑side
- **Acessos**:
  - não confiar em “esconder menu”; backend é o enforcement final

---

## 4) DoD — Migration / Script operacional
- **Idempotência**: script/migration deve ser seguro para reexecução quando aplicável.
- **Escopo**: não executar destructive ops sem confirmação/runbook.
- **Logs**: logar início/fim e contagens (linhas afetadas).
- **Segredos**: nunca commitar tokens/credenciais; usar env vars.
- **Ambiente**: scripts perigosos devem ser “runbook only” em prod.

---

## 5) Critérios de aceite (gestão)
Um item só está “Done” quando:
- passou pelo checklist acima
- está documentado (domínio/contract/runbook se necessário)
- possui plano de validação (como validar + rollback)

