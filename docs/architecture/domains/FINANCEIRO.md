# Domínio — Financeiro

## 1) Escopo
- Contas a pagar/receber
- Baixas (juros, multa, desconto, IOF, tarifas)
- Faturamento e cobrança (boletos, Pix)
- Remessas/retornos (CNAB)
- Conciliação bancária
- DDA (inbox e matching)

## 2) Invariantes (não negociáveis)
- Multi-tenant: toda query filtra por organizationId do contexto.
- Branch scoping quando houver branchId: valida allowedBranches.
- Integridade: fluxos multi-step são transacionais.
- Auditoria: createdBy/updatedBy são UUID string.
- Idempotência: integrações e webhooks não duplicam efeitos.

## 3) Entidades principais (alto nível)
- accounts_payable
- accounts_receivable
- financial_transactions
- bank_accounts / bank_transactions
- bank_remittances
- billing_invoices
- (Integrações) btg_boletos / btg_payments / btg_pix_charges / btg_dda_*

## 4) Status & máquina de estados
### Contas a pagar
- OPEN → PROCESSING (remessa) → PAID
- Regras:
  - OPEN pode editar
  - PROCESSING bloqueia alteração de valor
  - PAID bloqueia edição/exclusão

### Contas a receber
- OPEN → (boleto/pix gerado) → PAID

## 5) Fluxos críticos
- Baixa de contas a pagar (gera financial_transaction + contabiliza baixa)
- Finalização de faturamento (fecha invoice + cria receivable)
- Geração de boleto (BTG e/ou interno)
- Remessa CNAB (seleção de títulos + geração + marca status)
- Conciliação (import OFX + matching + reconciliação)

## 6) Endpoints críticos (com contrato)
- /api/financial/payables
- /api/financial/receivables
- /api/financial/billing
- /api/financial/remittances
- /api/financial/bank-transactions/import-ofx
- /api/financial/dda/sync

Para cada endpoint crítico:
- Auth + Tenant Context + RBAC + branch scoping
- Transação se multi-step
- Paginação no SQL Server

## 7) Segurança & RBAC (mínimo)
- financial.payables.read/write/pay
- financial.receivables.read/write/receive
- financial.billing.read/write/approve
- financial.remittances.generate/download
- financial.banking.import_ofx
- financial.dda.sync

## 8) Performance (SQL Server)
- Paginação no banco (OFFSET/FETCH)
- Índices por (organization_id, branch_id, status, due_date, deleted_at)
- Query Store ligado para regressão de plano

## 9) Observabilidade
- p95/p99 por endpoint crítico
- taxa de erro (400/409/500) por endpoint
- deadlocks/timeouts no SQL Server
- tamanho e tempo de geração de CNAB

## 10) Riscos atuais & mitigação
- Estado parcial sem transação → Onda 2
- Rotas operacionais sem auth/RBAC → Onda 0
- userId parseInt → Onda 1
- SQL interpolado em integrações → Onda 2
