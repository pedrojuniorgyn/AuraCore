-- Migration: 0060_fix_workflow_approval_columns.sql
-- Data: 2026-02-03
-- Épico: BUG-027
-- Autor: Cursor AI
--
-- CORREÇÃO: Adiciona colunas de workflow à strategic_strategy de forma idempotente
-- A migration 0053 pode ter falhado ou não sido aplicada. Esta migration é segura
-- para executar em qualquer estado do banco.
--
-- IMPORTANTE: Testar em ambiente local antes de executar em homolog/prod
-- Rollback: Não aplicável (colunas são opcionais e não quebram nada se removidas)

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ========================================
-- 1. Verificar e adicionar workflow_status
-- ========================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'strategic_strategy' AND COLUMN_NAME = 'workflow_status'
)
BEGIN
  ALTER TABLE strategic_strategy
  ADD workflow_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT';
  PRINT 'Adicionada coluna: workflow_status';
END
ELSE
BEGIN
  PRINT 'Coluna workflow_status já existe';
END
GO

-- Adicionar CHECK constraint se não existir
IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints 
  WHERE name = 'chk_strategy_workflow_status'
)
BEGIN
  ALTER TABLE strategic_strategy
  ADD CONSTRAINT chk_strategy_workflow_status 
  CHECK (workflow_status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'));
  PRINT 'Adicionada constraint: chk_strategy_workflow_status';
END
GO

-- ========================================
-- 2. Verificar e adicionar submitted_at
-- ========================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'strategic_strategy' AND COLUMN_NAME = 'submitted_at'
)
BEGIN
  ALTER TABLE strategic_strategy
  ADD submitted_at DATETIME2 NULL;
  PRINT 'Adicionada coluna: submitted_at';
END
GO

-- ========================================
-- 3. Verificar e adicionar submitted_by_user_id
-- ========================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'strategic_strategy' AND COLUMN_NAME = 'submitted_by_user_id'
)
BEGIN
  ALTER TABLE strategic_strategy
  ADD submitted_by_user_id INT NULL;
  PRINT 'Adicionada coluna: submitted_by_user_id';
END
GO

-- ========================================
-- 4. Verificar e adicionar approved_at
-- ========================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'strategic_strategy' AND COLUMN_NAME = 'approved_at'
)
BEGIN
  ALTER TABLE strategic_strategy
  ADD approved_at DATETIME2 NULL;
  PRINT 'Adicionada coluna: approved_at';
END
GO

-- ========================================
-- 5. Verificar e adicionar approved_by_user_id (COLUNA QUE CAUSOU BUG-027)
-- ========================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'strategic_strategy' AND COLUMN_NAME = 'approved_by_user_id'
)
BEGIN
  ALTER TABLE strategic_strategy
  ADD approved_by_user_id INT NULL;
  PRINT 'Adicionada coluna: approved_by_user_id';
END
GO

-- ========================================
-- 6. Verificar e adicionar rejected_at
-- ========================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'strategic_strategy' AND COLUMN_NAME = 'rejected_at'
)
BEGIN
  ALTER TABLE strategic_strategy
  ADD rejected_at DATETIME2 NULL;
  PRINT 'Adicionada coluna: rejected_at';
END
GO

-- ========================================
-- 7. Verificar e adicionar rejected_by_user_id
-- ========================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'strategic_strategy' AND COLUMN_NAME = 'rejected_by_user_id'
)
BEGIN
  ALTER TABLE strategic_strategy
  ADD rejected_by_user_id INT NULL;
  PRINT 'Adicionada coluna: rejected_by_user_id';
END
GO

-- ========================================
-- 8. Verificar e adicionar rejection_reason
-- ========================================
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'strategic_strategy' AND COLUMN_NAME = 'rejection_reason'
)
BEGIN
  ALTER TABLE strategic_strategy
  ADD rejection_reason NVARCHAR(1000) NULL;
  PRINT 'Adicionada coluna: rejection_reason';
END
GO

-- ========================================
-- 9. Criar índice para workflow_status (se não existir)
-- ========================================
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes 
  WHERE name = 'idx_strategic_strategy_workflow_status'
)
BEGIN
  CREATE NONCLUSTERED INDEX idx_strategic_strategy_workflow_status
  ON strategic_strategy (workflow_status, organization_id, branch_id)
  WHERE deleted_at IS NULL;
  PRINT 'Criado índice: idx_strategic_strategy_workflow_status';
END
GO

-- ========================================
-- 10. Verificação final - listar colunas adicionadas
-- ========================================
SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'strategic_strategy'
  AND COLUMN_NAME IN (
    'workflow_status',
    'submitted_at',
    'submitted_by_user_id',
    'approved_at',
    'approved_by_user_id',
    'rejected_at',
    'rejected_by_user_id',
    'rejection_reason'
  )
ORDER BY COLUMN_NAME;
GO

PRINT '✅ Migration 0060_fix_workflow_approval_columns concluída com sucesso!';
GO
