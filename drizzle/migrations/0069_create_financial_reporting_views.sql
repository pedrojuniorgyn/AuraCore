-- Migration: 0069_create_financial_reporting_views.sql
-- Data: 2026-02-08
-- Épico: F2.4
-- Autor: AuraCore
--
-- Cria SQL Views para reporting financeiro:
--   1. vw_cash_flow - Fluxo de caixa projetado (por mês)
--   2. vw_dre_report - DRE (Demonstração de Resultado do Exercício)
--   3. vw_trial_balance - Balancete de Verificação
--
-- IMPORTANTE: Testar em ambiente local antes de executar em homolog/prod
-- Rollback: DROP VIEW vw_cash_flow; DROP VIEW vw_dre_report; DROP VIEW vw_trial_balance;

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================================
-- 1. VW_CASH_FLOW - Fluxo de Caixa Projetado
-- Agrega contas a receber e a pagar por mês de vencimento.
-- Uso: projeção de entradas/saídas futuras.
-- ============================================================
IF OBJECT_ID('dbo.vw_cash_flow', 'V') IS NOT NULL
  DROP VIEW dbo.vw_cash_flow;
GO

CREATE VIEW dbo.vw_cash_flow AS
SELECT
  organization_id,
  branch_id,
  period_year,
  period_month,
  SUM(income_amount) AS total_income,
  SUM(expense_amount) AS total_expense,
  SUM(income_amount) - SUM(expense_amount) AS net_cash_flow
FROM (
  -- Entradas: contas a receber em aberto
  SELECT
    organization_id,
    branch_id,
    YEAR(due_date) AS period_year,
    MONTH(due_date) AS period_month,
    CAST(amount AS DECIMAL(18,2)) AS income_amount,
    CAST(0 AS DECIMAL(18,2)) AS expense_amount
  FROM accounts_receivable
  WHERE status IN ('OPEN', 'PARTIALLY_PAID')
    AND deleted_at IS NULL

  UNION ALL

  -- Saídas: contas a pagar em aberto
  SELECT
    organization_id,
    branch_id,
    YEAR(due_date) AS period_year,
    MONTH(due_date) AS period_month,
    CAST(0 AS DECIMAL(18,2)) AS income_amount,
    CAST(amount AS DECIMAL(18,2)) AS expense_amount
  FROM accounts_payable
  WHERE status IN ('OPEN', 'PARTIALLY_PAID')
    AND deleted_at IS NULL
) AS cash_movements
GROUP BY organization_id, branch_id, period_year, period_month;
GO

PRINT 'Criada view: vw_cash_flow';
GO

-- ============================================================
-- 2. VW_DRE_REPORT - Demonstração de Resultado do Exercício
-- Agrega receitas e despesas pagas por período.
-- Base: títulos liquidados (status = PAID).
-- ============================================================
IF OBJECT_ID('dbo.vw_dre_report', 'V') IS NOT NULL
  DROP VIEW dbo.vw_dre_report;
GO

CREATE VIEW dbo.vw_dre_report AS
SELECT
  organization_id,
  branch_id,
  period_year,
  period_month,
  SUM(revenue) AS total_revenue,
  SUM(expense) AS total_expense,
  SUM(revenue) - SUM(expense) AS net_profit,
  CASE 
    WHEN SUM(revenue) > 0 
    THEN CAST((SUM(revenue) - SUM(expense)) * 100.0 / SUM(revenue) AS DECIMAL(8,2))
    ELSE 0
  END AS profit_margin_pct
FROM (
  -- Receitas: contas a receber pagas
  SELECT
    organization_id,
    branch_id,
    YEAR(COALESCE(receive_date, paid_at)) AS period_year,
    MONTH(COALESCE(receive_date, paid_at)) AS period_month,
    CAST(amount AS DECIMAL(18,2)) AS revenue,
    CAST(0 AS DECIMAL(18,2)) AS expense
  FROM accounts_receivable
  WHERE status = 'PAID'
    AND deleted_at IS NULL
    AND COALESCE(receive_date, paid_at) IS NOT NULL

  UNION ALL

  -- Despesas: contas a pagar pagas
  SELECT
    organization_id,
    branch_id,
    YEAR(COALESCE(pay_date, paid_at)) AS period_year,
    MONTH(COALESCE(pay_date, paid_at)) AS period_month,
    CAST(0 AS DECIMAL(18,2)) AS revenue,
    CAST(amount AS DECIMAL(18,2)) AS expense
  FROM accounts_payable
  WHERE status = 'PAID'
    AND deleted_at IS NULL
    AND COALESCE(pay_date, paid_at) IS NOT NULL
) AS financial_movements
GROUP BY organization_id, branch_id, period_year, period_month;
GO

PRINT 'Criada view: vw_dre_report';
GO

-- ============================================================
-- 3. VW_TRIAL_BALANCE - Balancete de Verificação
-- Agrega débitos e créditos por conta contábil.
-- Base: lançamentos contábeis postados.
-- ============================================================
IF OBJECT_ID('dbo.vw_trial_balance', 'V') IS NOT NULL
  DROP VIEW dbo.vw_trial_balance;
GO

CREATE VIEW dbo.vw_trial_balance AS
SELECT
  je.organization_id,
  je.branch_id,
  YEAR(je.entry_date) AS period_year,
  MONTH(je.entry_date) AS period_month,
  jel.account_code,
  coa.name AS account_name,
  coa.type AS account_type,
  SUM(CASE WHEN jel.entry_type = 'DEBIT' THEN CAST(jel.amount AS DECIMAL(18,2)) ELSE 0 END) AS total_debit,
  SUM(CASE WHEN jel.entry_type = 'CREDIT' THEN CAST(jel.amount AS DECIMAL(18,2)) ELSE 0 END) AS total_credit,
  SUM(CASE WHEN jel.entry_type = 'DEBIT' THEN CAST(jel.amount AS DECIMAL(18,2)) ELSE 0 END)
    - SUM(CASE WHEN jel.entry_type = 'CREDIT' THEN CAST(jel.amount AS DECIMAL(18,2)) ELSE 0 END) AS balance
FROM journal_entries je
INNER JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
LEFT JOIN chart_of_accounts coa 
  ON coa.code = jel.account_code 
  AND coa.organization_id = je.organization_id
WHERE je.status = 'POSTED'
  AND je.deleted_at IS NULL
  AND jel.deleted_at IS NULL
GROUP BY 
  je.organization_id, je.branch_id,
  YEAR(je.entry_date), MONTH(je.entry_date),
  jel.account_code, coa.name, coa.type;
GO

PRINT 'Criada view: vw_trial_balance';
GO
