# AuraCore — Arquitetura (Índice)

## Objetivo
Formalizar a arquitetura existente (ERP Enterprise TMS/WMS/Financeiro/Contábil), reduzir risco de manutenção e padronizar contratos de segurança/integração/performance.

## Leitura rápida (ordem sugerida)
1. Contracts
   - [Tenant + Branch](./contracts/TENANT_BRANCH_CONTRACT.md)
   - [RBAC](./contracts/RBAC_CONTRACT.md)
   - [API Contract](./contracts/API_CONTRACT.md)
   - [Erros](./contracts/ERROR_CONTRACT.md)
   - [Transações](./contracts/TRANSACTIONS_CONTRACT.md)
   - [SQL Server & Performance](./contracts/SQLSERVER_PERFORMANCE_CONTRACT.md)

2. Domínios
   - [Financeiro](./domains/FINANCEIRO.md)
   - [Contábil](./domains/CONTABIL.md)
   - [Admin](./domains/ADMIN.md)
   - [TMS](./domains/TMS.md)
   - [Auditoria v2](./domains/AUDITORIA_V2.md)
   - [Tenancy + Branch scoping](./domains/TENANCY_BRANCH_SCOPING.md)

3. Diagramas
   - [C4 — Context](./diagrams/C4_CONTEXT.md)
   - [C4 — Container](./diagrams/C4_CONTAINER.md)
   - [C4 — Component (Backend)](./diagrams/C4_COMPONENT_BACKEND.md)
   - [Estados — Fiscal/Contábil/Financeiro](./diagrams/STATE_FISCAL_ACCOUNTING_FINANCIAL.md)
   - [Sequência — Baixa Contas a Pagar](./diagrams/SEQ_FINANCEIRO_BAIXA_CP.md)
   - [Sequência — Posting Contábil](./diagrams/SEQ_ACCOUNTING_POSTING.md)
   - [Sequência — Webhook BTG](./diagrams/SEQ_BTG_WEBHOOK.md)
   - [Sequência — TMS Jornada](./diagrams/SEQ_TMS_JORNADA.md)

4. Decisões (ADR)
   - [SQL Server only](./adr/0001-sqlserver-only.md)
   - [Tenant Context](./adr/0002-tenant-context-as-source-of-truth.md)
   - [UserId UUID string](./adr/0003-userid-is-uuid-string.md)
   - [Admin HTTP OFF em PROD](./adr/0004-admin-http-off-in-prod.md)
   - [Transações obrigatórias](./adr/0005-transactions-required-financial-accounting.md)
   - [Paginação e busca no SQL Server](./adr/0006-pagination-and-search-sqlserver.md)

5. Operação
   - [Deploy Coolify](./runbooks/RUNBOOK_COOLIFY_DEPLOY.md)
   - [Migrations & Seeds](./runbooks/RUNBOOK_MIGRATIONS_SEEDS.md)
   - [SQL Server 2022](./runbooks/RUNBOOK_SQLSERVER_2022.md)
   - [Auditoria v2](./runbooks/RUNBOOK_AUDITORIA_V2.md)
   - [Incidentes](./runbooks/RUNBOOK_INCIDENTS.md)

## Guardrails
- Stack: Next.js (App Router), TypeScript, Drizzle (dialect mssql), SQL Server 2022, node-mssql.
- Proibido: assumir Postgres/MySQL/SQLite.
- Segurança: multi-tenant + branch scoping + RBAC sempre no backend.
