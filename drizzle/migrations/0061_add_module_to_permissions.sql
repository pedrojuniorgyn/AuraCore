-- Migration: 0061_add_module_to_permissions.sql
-- Data: 2026-02-05
-- Sprint: Sprint 2 - Backend APIs de Roles
-- Autor: AuraCore Dev
--
-- DESCRIÇÃO: Adiciona coluna 'module' à tabela permissions para agrupar
-- permissões por módulo (admin, tms, financial, etc).
--
-- ROLLBACK: ALTER TABLE permissions DROP COLUMN module;

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Adicionar coluna module se não existir
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'permissions' AND COLUMN_NAME = 'module'
)
BEGIN
  ALTER TABLE permissions ADD module NVARCHAR(50) NULL;
  PRINT 'Coluna module adicionada à tabela permissions';
END
GO

-- Atualizar permissões existentes para derivar module do slug
-- Ex: 'admin.users.manage' -> module = 'admin'
-- Ex: 'tms.create' -> module = 'tms'
UPDATE permissions
SET module = LEFT(slug, CHARINDEX('.', slug) - 1)
WHERE module IS NULL 
  AND CHARINDEX('.', slug) > 0;
PRINT 'Atualizado module baseado no slug para permissões existentes';
GO

-- Verificar resultado
SELECT id, slug, module, description 
FROM permissions 
ORDER BY module, slug;
GO
