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
    CONSTRAINT fk_approvers_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT uq_approver_user UNIQUE (organization_id, branch_id, user_id, scope, department_id)
  );
  
  PRINT 'Tabela strategic_approval_approvers criada com sucesso';
END
ELSE
BEGIN
  PRINT 'Tabela strategic_approval_approvers já existe';
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
-- Seed data: Criar aprovador admin para org 1
-- =====================================================

-- Verificar se já existe algum aprovador
IF NOT EXISTS (SELECT 1 FROM strategic_approval_approvers WHERE organization_id = 1)
BEGIN
  -- Buscar primeiro usuário ativo da org 1 (assumido como admin)
  DECLARE @AdminUserId INT;
  
  SELECT TOP 1 @AdminUserId = id 
  FROM users 
  WHERE organization_id = 1 
    AND is_active = 1
  ORDER BY created_at;
  
  IF @AdminUserId IS NOT NULL
  BEGIN
    INSERT INTO strategic_approval_approvers (
      id, organization_id, branch_id, user_id, 
      role, scope, is_active, created_by
    )
    VALUES (
      NEWID(), 
      1, 
      1, 
      @AdminUserId, 
      'ADMIN', 
      'ALL', 
      1, 
      NULL
    );
    
    PRINT 'Aprovador admin criado para organização 1';
  END
  ELSE
  BEGIN
    PRINT 'Nenhum usuário encontrado para criar aprovador padrão';
  END
END
ELSE
BEGIN
  PRINT 'Já existem aprovadores configurados';
END
GO

-- =====================================================
-- Rollback (se necessário)
-- =====================================================

/*
-- Para reverter esta migration:

DROP INDEX IF EXISTS idx_approvers_user ON strategic_approval_approvers;
DROP INDEX IF EXISTS idx_approvers_org_branch_active ON strategic_approval_approvers;
DROP TABLE IF EXISTS strategic_approval_approvers;
GO
*/

PRINT 'Migration 0059_add_approval_permissions.sql concluída com sucesso';
GO
