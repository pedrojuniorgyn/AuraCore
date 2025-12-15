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

## Checklist Enterprise (obrigatório)
- [ ] Tenant Context / multi-tenant ok (organizationId do contexto)
- [ ] Branch scoping ok (allowedBranches) quando aplicável
- [ ] RBAC ok (`withPermission`) para operações sensíveis
- [ ] Input validation (Zod) em POST/PUT/PATCH quando aplicável
- [ ] Transação em fluxos multi-step quando aplicável
- [ ] Sem `parseInt(session.user.id)` (userId é UUID string)
- [ ] Sem SQL interpolado em query (preferir parametrização)
- [ ] Sem paginação por `.slice()` em endpoints de volume

## Test plan
- [ ] Smoke test manual do fluxo principal

---
Referência completa: `docs/architecture/PR_TEMPLATE.md` e `docs/architecture/INDEX.md`
