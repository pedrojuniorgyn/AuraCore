# 🗺️ ROADMAP DE CORREÇÕES

## SPRINT 1: BLINDAGEM (CRÍTICO)
**Foco:** Segurança e Integridade de Dados
**Estimativa:** 40 horas

- [ ] **DB-001:** Adicionar `organizationId/branchId` em schemas do módulo Strategic.
- [ ] **DB-002:** Adicionar `organizationId/branchId` em `agent-messages`.
- [ ] **DB-003:** Criar migration para aplicar alterações de DB (com default value para dados existentes).
- [ ] **API-001:** Implementar Zod Validation no módulo **Financial** (todas as rotas de escrita).
- [ ] **API-002:** Implementar Zod Validation no módulo **Fiscal** (todas as rotas de escrita).
- [ ] **TS-001:** Corrigir os 25 erros de compilação TypeScript (bloqueante para CI/CD confiável).

## SPRINT 2: ESTABILIZAÇÃO (ALTO)
**Foco:** Robustez da API e Qualidade de Código
**Estimativa:** 40 horas

- [ ] **API-003:** Implementar Zod Validation no módulo **WMS**.
- [ ] **API-004:** Implementar Zod Validation no módulo **TMS**.
- [ ] **API-005:** Implementar Zod Validation no módulo **Strategic**.
- [ ] **CODE-001:** Refatorar `throw new Error` para `Result.fail` nas Entities de domínio.
- [ ] **SEC-001:** Revisar e remover hardcoded secrets (se houver falsos positivos na auditoria, marcar como ignorados; se reais, mover para .env).

## SPRINT 3: DOCUMENTAÇÃO & DÉBITO TÉCNICO (MÉDIO)
**Foco:** Manutenibilidade
**Estimativa:** 30 horas

- [ ] **DOC-001:** Criar README.md detalhado para módulo Fiscal (explicando arquitetura IBS/CBS).
- [ ] **DOC-002:** Criar README.md para módulo Financial.
- [ ] **DEBT-001:** Analisar e resolver TODOs relacionados a "FIXME" ou bugs potenciais.
- [ ] **TEST-001:** Aumentar cobertura de testes unitários nas Entities (foco nas regras de negócio fiscais).
