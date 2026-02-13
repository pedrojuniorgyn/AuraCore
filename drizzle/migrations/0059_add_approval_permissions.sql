-- Migration: Add Approval Permissions System
-- Description: Tabela de aprovadores configurados + suporte a permissões
-- Date: 2026-02-02
-- Epic: FASE7-04
-- Task: Implementar sistema de permissões para workflow de aprovação

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- =====================================================
-- Tabela: strategic_approval_approvers
-- Descrição: Usuários configurados como aprovadores
-- =====================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_approval_approvers')
BEGIN
  CREATE TABLE strategic_approval_approvers (
    id VARCHAR(36) NOT NULL DEFAULT NEWID(),
    organization_id INT NOT NULL,
    branch_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(50) NULL, -- Ex: 'CFO', 'CEO', 'DIRECTOR', 'MANAGER'
    scope VARCHAR(20) NOT NULL DEFAULT 'ALL', -- 'ALL', 'DEPARTMENT', 'SPECIFIC'
    department_id VARCHAR(36) NULL, -- Se scope = 'DEPARTMENT'
    is_active BIT NOT NULL DEFAULT 1,
    created_by VARCHAR(36) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT pk_strategic_approval_approvers PRIMARY KEY (id),
    CONSTRAINT fk_approvers_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
    -- NOTA: UNIQUE constraint sem department_id - índices filtrados abaixo garantem unicidade
  );
  
  PRINT 'Tabela strategic_approval_approvers criada com sucesso';
END
ELSE
BEGIN
  PRINT 'Tabela strategic_approval_approvers já existe';
END
GO

-- =====================================================
-- Índices de unicidade (resolvem NULL != NULL em UNIQUE)
-- =====================================================

-- Índice único para scope='ALL' (garante 1 aprovador ALL por user/org/branch)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_approver_all_scope')
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX uq_approver_all_scope
  ON strategic_approval_approvers (organization_id, branch_id, user_id, scope)
  WHERE scope = 'ALL' AND department_id IS NULL;
  
  PRINT 'Índice único uq_approver_all_scope criado';
END
GO

-- Índice único para scope='DEPARTMENT' (garante 1 aprovador por user/org/branch/dept)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_approver_department_scope')
BEGIN
  CREATE UNIQUE NONCLUSTERED INDEX uq_approver_department_scope
  ON strategic_approval_approvers (organization_id, branch_id, user_id, scope, department_id)
  WHERE scope = 'DEPARTMENT' AND department_id IS NOT NULL;
  
  PRINT 'Índice único uq_approver_department_scope criado';
END
GO

-- Índice composto para queries de aprovadores
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_approvers_org_branch_active')
BEGIN
  CREATE NONCLUSTERED INDEX idx_approvers_org_branch_active
  ON strategic_approval_approvers (organization_id, branch_id, is_active)
  WHERE is_active = 1;
  
  PRINT 'Índice idx_approvers_org_branch_active criado';
END
GO

-- Índice para queries por usuário
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_approvers_user')
BEGIN
  CREATE NONCLUSTERED INDEX idx_approvers_user
  ON strategic_approval_approvers (user_id, organization_id, branch_id)
  WHERE is_active = 1;
  
  PRINT 'Índice idx_approvers_user criado';
END
GO

-- =====================================================
-- Tabela: strategic_approval_delegate
-- Descrição: Delegações temporárias de permissões de aprovação
-- NOTA: Migration 0053 criou com UNIQUEIDENTIFIER, mas podemos usar VARCHAR(36)
-- =====================================================

-- Cenário 1: Tabela existe com UNIQUEIDENTIFIER (migration 0053)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = 'strategic_approval_delegate' 
           AND COLUMN_NAME = 'id' 
           AND DATA_TYPE = 'uniqueidentifier')
BEGIN
  PRINT '⚠️  AVISO: strategic_approval_delegate.id é UNIQUEIDENTIFIER (migration 0053)';
  PRINT '⚠️  Drizzle ORM espera VARCHAR(36)';
  PRINT '⚠️  Tabela funciona, mas com type mismatch';
  PRINT '⚠️  Para converter: ver comentários na migration 0053';
END
-- Cenário 2: Tabela existe com VARCHAR(36) (já convertida)
ELSE IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_approval_delegate')
BEGIN
  PRINT '✅ strategic_approval_delegate já existe com schema correto (VARCHAR)';
END
-- Cenário 3: Tabela NÃO existe (criar agora)
ELSE
BEGIN
  CREATE TABLE strategic_approval_delegate (
    id VARCHAR(36) NOT NULL DEFAULT CAST(NEWID() AS VARCHAR(36)),
    organization_id INT NOT NULL,
    branch_id INT NOT NULL,
    delegator_user_id INT NOT NULL, -- Quem delega
    delegate_user_id INT NOT NULL,  -- Quem recebe
    start_date DATETIME2 NOT NULL,
    end_date DATETIME2 NULL,        -- NULL = sem data fim
    is_active BIT NOT NULL DEFAULT 1,
    created_by VARCHAR(36) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT pk_strategic_approval_delegate PRIMARY KEY (id),
    CONSTRAINT fk_delegate_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT chk_delegate_dates CHECK (end_date IS NULL OR end_date > start_date)
  );
  
  PRINT '✅ strategic_approval_delegate criada com sucesso (VARCHAR(36))';
END
GO

-- Índice composto tenant (SCHEMA-003)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_approval_delegate_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX idx_approval_delegate_tenant
  ON strategic_approval_delegate (organization_id, branch_id)
  WHERE is_active = 1;
  
  PRINT 'Índice idx_approval_delegate_tenant criado';
END
GO

-- Índice para queries de delegação ativa
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_delegate_delegator_delegate_active')
BEGIN
  CREATE NONCLUSTERED INDEX idx_delegate_delegator_delegate_active
  ON strategic_approval_delegate (delegator_user_id, delegate_user_id, organization_id, branch_id, is_active)
  WHERE is_active = 1;
  
  PRINT 'Índice idx_delegate_delegator_delegate_active criado';
END
GO

-- =====================================================
-- Seed data: Criar aprovador admin para org 1
-- =====================================================

-- Seed: Criar aprovador admin para org 1
-- NOTA: Seed só funciona se users.id for INT e approvers.user_id for INT.
--       Em ambientes onde users.id é VARCHAR(36)/UUID, o seed é ignorado.
IF NOT EXISTS (SELECT 1 FROM strategic_approval_approvers WHERE organization_id = 1)
BEGIN
  -- Verificar compatibilidade de tipo: users.id deve ser INT para o seed funcionar
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'id' AND DATA_TYPE = 'int')
  BEGIN
    DECLARE @AdminUserId INT;
    SELECT TOP 1 @AdminUserId = id FROM users WHERE organization_id = 1 ORDER BY created_at;

    IF @AdminUserId IS NOT NULL
    BEGIN
      INSERT INTO strategic_approval_approvers (
        id, organization_id, branch_id, user_id, 
        role, scope, is_active, created_by
      )
      VALUES (
        NEWID(), 1, 1, @AdminUserId, 'ADMIN', 'ALL', 1, NULL
      );
      PRINT 'Aprovador admin criado para organização 1';
    END
    ELSE
      PRINT 'Nenhum usuário encontrado para criar aprovador padrão';
  END
  ELSE
    PRINT 'SKIP seed: users.id não é INT (provavelmente UUID/VARCHAR). Seed de aprovador ignorado.';
END
ELSE
  PRINT 'Já existem aprovadores configurados';
GO

-- =====================================================
-- Rollback (se necessário)
-- =====================================================

-- Para reverter esta migration:
-- DROP INDEX IF EXISTS idx_delegate_delegator_delegate_active ON strategic_approval_delegate;
-- DROP INDEX IF EXISTS idx_approval_delegate_tenant ON strategic_approval_delegate;
-- DROP TABLE IF EXISTS strategic_approval_delegate;
-- DROP INDEX IF EXISTS idx_approvers_user ON strategic_approval_approvers;
-- DROP INDEX IF EXISTS idx_approvers_org_branch_active ON strategic_approval_approvers;
-- DROP TABLE IF EXISTS strategic_approval_approvers;

PRINT 'Migration 0059_add_approval_permissions.sql concluída com sucesso';
GO
