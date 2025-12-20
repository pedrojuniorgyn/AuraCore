# Domínio — Auditoria (AuditFinDB)

## Objetivo
O domínio **Auditoria** fornece visões **auditadas** (via snapshot/ETL) do financeiro do ERP legado para:
- identificar inconsistências (achados)
- inspecionar parcelas de contas a pagar/receber
- analisar fluxo de caixa diário

O módulo roda **100% dentro do AuraCore**, porém consulta dois bancos SQL Server:
- **AuraCore DB** (aplicação): tenants/branches/usuários e RBAC/data scoping
- **AuditFinDB** (auditoria): tabelas `audit_*` com dados materializados por `run_id`
- **Legado** (ERP): fonte de dados para extração no snapshot

## Fonte de dados (ETL)
O ETL é disparado por “snapshot run” e grava os resultados no AuditFinDB.

### Tabelas relevantes (AuditFinDB)
- `dbo.audit_snapshot_runs` (controle de execução, `run_id`, status, período)
- `dbo.audit_fact_parcelas` (parcelas/títulos auditados)
- `dbo.audit_findings` (achados: alertas e inconsistências)
- `dbo.audit_fact_cashflow_daily` (fluxo de caixa diário)

### Multi-tenancy + scoping por filial
Quando o schema do AuditFinDB suporta:
- `audit_snapshot_runs.organization_id`: isola runs por tenant (AuraCore)
- `audit_snapshot_runs.branch_id`: isola runs por filial (AuraCore)
- `audit_snapshot_runs.legacy_company_branch_code`: mapeia para `CodigoEmpresaFilial` no legado

Regras:
- **ADMIN**: pode ver todas as filiais da organização
- **não-admin**: vê apenas `allowedBranches`

## Permissões (RBAC)
Ver contract canônico: `docs/architecture/contracts/RBAC_CONTRACT.md`.

Permissões do domínio:
- `audit.read`
- `audit.run`
- `audit.migrate`

## Rotas (UI)
As telas do módulo Auditoria espelham a nomenclatura do Financeiro para reduzir curva de aprendizado:

- **Auditoria → Contas a Pagar**: `/auditoria/contas-pagar`
  - Parcelas (débito), filtradas por `operacao=PAGAMENTO`
- **Auditoria → Contas a Receber**: `/auditoria/contas-receber`
  - Parcelas (crédito), filtradas por `operacao=RECEBIMENTO`
- **Auditoria → Conciliação (Achados)**: `/auditoria/conciliacao`
- **Auditoria → Fluxo de Caixa**: `/auditoria/cashflow`
- **Auditoria → Snapshots**: `/auditoria/snapshots`

Compatibilidade:
- `/auditoria/parcelas` → redirect para `/auditoria/contas-pagar`
- `/auditoria/findings` → redirect para `/auditoria/conciliacao`

## Endpoints (API)
Os endpoints do AuditFinDB ficam sob `/api/admin/audit/*` e aplicam:
- RBAC via `withPermission()`
- multi-tenancy (quando `organization_id` existir)
- scoping por filial (quando `branch_id` existir)

Principais:
- `GET /api/admin/audit/parcelas` (filtros: `operacao`, `status`, `sinceDays`, flags)
- `GET /api/admin/audit/findings`
- `GET /api/admin/audit/cashflow`
- `GET /api/admin/audit/snapshots`
- `POST /api/admin/audit/snapshots/run`
- `POST /api/admin/audit/snapshots/migrate`
- `POST /api/admin/audit/snapshots/cleanup`

## Operação (produção)
Execução de ETL e migrações do AuditFinDB deve ser tratada como operação controlada:
- Preferir RBAC com usuário ADMIN e logs
- Para automação/execução controlada via infraestrutura, é permitido **token dedicado** (`x-audit-token`) quando habilitado pelo ambiente.

Ver runbook: `docs/architecture/runbooks/RUNBOOK_MIGRATIONS_SEEDS.md`.

