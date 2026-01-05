# ============================================
# ATUALIZAÇÃO docs/architecture/INDEX.md
# ============================================
# Data/Hora: 2026-01-05 17:00:00 UTC
# Épico: E7.12
# Autor: Claude (Arquiteto Enterprise)
# 
# INSTRUÇÕES: Substituir seção de ADRs no arquivo existente
# docs/architecture/INDEX.md
# ============================================

# AuraCore — Arquitetura (Índice)

**Data de Atualização:** 2026-01-05 17:00:00 UTC  
**Versão:** 2.0.0

## Objetivo
Formalizar a arquitetura existente (ERP Enterprise TMS/WMS/Financeiro/Contábil), reduzir risco de manutenção e padronizar contratos de segurança/integração/performance.

## Leitura rápida (ordem sugerida)

### 1. Contracts
- [Tenant + Branch](./contracts/TENANT_BRANCH_CONTRACT.md)
- [RBAC](./contracts/RBAC_CONTRACT.md)
- [API Contract](./contracts/API_CONTRACT.md)
- [Erros](./contracts/ERROR_CONTRACT.md)
- [Transações](./contracts/TRANSACTIONS_CONTRACT.md)
- [SQL Server & Performance](./contracts/SQLSERVER_PERFORMANCE_CONTRACT.md)

### 2. Domínios
- [Financeiro](./domains/FINANCEIRO.md)
- [Contábil](./domains/CONTABIL.md)
- [Admin](./domains/ADMIN.md)
- [TMS](./domains/TMS.md)
- [WMS](./domains/WMS.md) ← **NOVO E7.8**
- [Auditoria v2](./domains/AUDITORIA_V2.md)
- [Tenancy + Branch scoping](./domains/TENANCY_BRANCH_SCOPING.md)

### 3. Diagramas
- [C4 — Context](./diagrams/C4_CONTEXT.md)
- [C4 — Container](./diagrams/C4_CONTAINER.md)
- [C4 — Component (Backend)](./diagrams/C4_COMPONENT_BACKEND.md)
- [Estados — Fiscal/Contábil/Financeiro](./diagrams/STATE_FISCAL_ACCOUNTING_FINANCIAL.md)
- [Sequência — Baixa Contas a Pagar](./diagrams/SEQ_FINANCEIRO_BAIXA_CP.md)
- [Sequência — Posting Contábil](./diagrams/SEQ_ACCOUNTING_POSTING.md)
- [Sequência — Webhook BTG](./diagrams/SEQ_BTG_WEBHOOK.md)
- [Sequência — TMS Jornada](./diagrams/SEQ_TMS_JORNADA.md)

### 4. Decisões (ADR)

#### Fundamentais (2024)
- [ADR-0001: SQL Server only](./adr/0001-sqlserver-only.md)
- [ADR-0002: Tenant Context](./adr/0002-tenant-context-as-source-of-truth.md)
- [ADR-0003: UserId UUID string](./adr/0003-userid-is-uuid-string.md)
- [ADR-0004: Admin HTTP OFF em PROD](./adr/0004-admin-http-off-in-prod.md)
- [ADR-0005: Transações obrigatórias](./adr/0005-transactions-required-financial-accounting.md)
- [ADR-0006: Paginação e busca no SQL Server](./adr/0006-pagination-and-search-sqlserver.md)

#### Reforma Tributária 2026 (E7.4.1)
- [ADR-0010: Implementação IBS/CBS](./adr/0010-ibs-cbs-implementation.md) ← **NOVO**
- [ADR-0011: Split Payment Structure](./adr/0011-split-payment-structure.md) ← **NOVO**

#### Migração DDD/Hexagonal 100% (E7.12)
- [ADR-0012: Full DDD Migration](./adr/0012-full-ddd-migration.md) ← **NOVO**
- [ADR-0013: Eliminate Hybrid Architecture](./adr/0013-eliminate-hybrid-architecture.md) ← **NOVO**

### 5. Operação
- [Deploy Coolify](./runbooks/RUNBOOK_COOLIFY_DEPLOY.md)
- [Migrations & Seeds](./runbooks/RUNBOOK_MIGRATIONS_SEEDS.md)
- [SQL Server 2022](./runbooks/RUNBOOK_SQLSERVER_2022.md)
- [Auditoria v2](./runbooks/RUNBOOK_AUDITORIA_V2.md)
- [Incidentes](./runbooks/RUNBOOK_INCIDENTS.md)

### 6. DDD/Hexagonal (E7) ← **NOVA SEÇÃO**
- [E7 DDD/Hexagonal - Visão Geral](./E7_DDD_HEXAGONAL.md)
- [E7 Status Final](../E7_STATUS_FINAL.md)
- [E7.12 Documentation Master](../E7.12_DOCUMENTATION_MASTER.md)
- [Roadmap E7.12-E7.17](../../_documentation/planning/ROADMAP_E7.12_A_E7.17.md)

### 7. MCP Server
- [System Guide](../mcp/SYSTEM_GUIDE.md)
- [Lessons Learned](../mcp/LESSONS_LEARNED.md)
- [ENFORCE Rules](../mcp/SYSTEM_GUIDE.md#10-enforce-rules---wms-module-e78)

---

## Guardrails

### Stack Obrigatória
- Next.js (App Router)
- TypeScript (strict mode)
- Drizzle ORM (dialect mssql)
- SQL Server 2022
- node-mssql

### Proibido
- ❌ Assumir Postgres/MySQL/SQLite
- ❌ Usar `any` ou `@ts-ignore`
- ❌ Lógica de negócio em API routes (após E7.14)
- ❌ Services legados (após E7.17)

### Obrigatório
- ✅ Multi-tenant + branch scoping + RBAC sempre no backend
- ✅ DDD/Hexagonal para todas as operações (após E7.17)
- ✅ Transações SQL para operações multi-step
- ✅ Idempotência para operações de escrita
- ✅ Data/hora em todos os documentos

---

## Timeline de Mudanças Arquiteturais

```
2024-12 ────────────────────────────────────────────────────────────────►
        │
        ├── E7.0: Início migração DDD/Hexagonal
        │
2025-01 ├── E7.1-E7.4: Financial, Accounting, Fiscal
        │
2025-10 ├── E7.4.1: Reforma Tributária 2026 (IBS/CBS)
        │        └── ADR-0010, ADR-0011
        │
2025-12 ├── E7.5-E7.11: TMS, WMS, Integrações, Cleanup
        │
2026-01 ├── E7.12: Documentação 100%
        │        └── ADR-0012, ADR-0013
        │
2026-02 ├── E7.13-E7.14: Services e APIs → DDD
        │
2026-03 ├── E7.15-E7.16: SPED → DDD, Verificação Semântica
        │
2026-04 └── E7.17: Limpeza Final (100% DDD)
```

---

*Índice atualizado em: 2026-01-05 17:00:00 UTC*
