-- Migration 0054: Add Departments Table
-- Implementa tabela de departments dinâmica com multi-tenancy
-- Remove necessidade de hardcoded department fallbacks

-- ========================================
-- 1. Criar tabela department
-- ========================================
CREATE TABLE department (
    id VARCHAR(36) PRIMARY KEY DEFAULT NEWID(),
    organization_id INT NOT NULL,
    branch_id INT NOT NULL,

    code VARCHAR(20) NOT NULL,
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(500) NULL,

    -- Hierarquia (opcional)
    parent_id VARCHAR(36) NULL,

    -- Manager
    manager_user_id INT NULL,

    -- Status
    is_active BIT NOT NULL DEFAULT 1,

    -- Audit
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    created_by VARCHAR(100) NULL,
    updated_by VARCHAR(100) NULL,
    deleted_at DATETIME2 NULL,

    -- Constraints
    CONSTRAINT FK_department_organization
        FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT FK_department_parent
        FOREIGN KEY (parent_id) REFERENCES department(id),
    CONSTRAINT UQ_department_code
        UNIQUE (organization_id, branch_id, code)
);

-- ========================================
-- 2. Índices para performance
-- ========================================
CREATE NONCLUSTERED INDEX idx_department_tenant
    ON department(organization_id, branch_id)
    WHERE deleted_at IS NULL;

CREATE NONCLUSTERED INDEX idx_department_parent
    ON department(parent_id)
    WHERE parent_id IS NOT NULL AND deleted_at IS NULL;

CREATE NONCLUSTERED INDEX idx_department_active
    ON department(organization_id, branch_id, is_active)
    WHERE is_active = 1 AND deleted_at IS NULL;

CREATE NONCLUSTERED INDEX idx_department_code
    ON department(organization_id, branch_id, code)
    WHERE deleted_at IS NULL;

-- ========================================
-- 3. Atualizar action_plan para referenciar department
-- ========================================
ALTER TABLE strategic_action_plan
ADD department_id VARCHAR(36) NULL;

ALTER TABLE strategic_action_plan
ADD CONSTRAINT FK_action_plan_department
    FOREIGN KEY (department_id) REFERENCES department(id);

CREATE NONCLUSTERED INDEX idx_action_plan_department
    ON strategic_action_plan(department_id)
    WHERE department_id IS NOT NULL AND deleted_at IS NULL;

-- ========================================
-- 4. Comentários de documentação
-- ========================================
EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Tabela de departments por organização/filial - remove necessidade de hardcoded values',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE', @level1name = 'department';

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Código único do department dentro da org/filial',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE', @level1name = 'department',
    @level2type = N'COLUMN', @level2name = 'code';

EXEC sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'Relacionamento com department para categorização',
    @level0type = N'SCHEMA', @level0name = 'dbo',
    @level1type = N'TABLE', @level1name = 'strategic_action_plan',
    @level2type = N'COLUMN', @level2name = 'department_id';
