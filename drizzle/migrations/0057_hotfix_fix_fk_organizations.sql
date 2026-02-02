-- ========================================
-- Hotfix 0057: Fix Invalid FK References
-- ========================================
-- BUG-021: Foreign keys referenciando 'organizations' (plural) em vez de 'organization' (singular)
-- Causa: Inconsistência em nomes de tabelas em migrations 0053 e 0054
-- Impacto: Constraints não criadas (silent fail), integridade referencial comprometida
-- Data: 2026-02-02

-- ========================================
-- 1. strategic_approval_history → organization
-- ========================================
PRINT 'Fixing strategic_approval_history FK...';

-- Drop se existir (pode ter falhado na criação)
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_approval_history_org')
BEGIN
    PRINT '  Dropping existing FK...';
    ALTER TABLE strategic_approval_history 
    DROP CONSTRAINT fk_approval_history_org;
END;
GO

-- Recriar com referência correta
ALTER TABLE strategic_approval_history
ADD CONSTRAINT fk_approval_history_org 
    FOREIGN KEY (organization_id) REFERENCES organization(id);
GO

PRINT '  ✓ FK created successfully';
GO

-- ========================================
-- 2. strategic_approval_delegate → organization
-- ========================================
PRINT 'Fixing strategic_approval_delegate FK...';

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_approval_delegate_org')
BEGIN
    PRINT '  Dropping existing FK...';
    ALTER TABLE strategic_approval_delegate 
    DROP CONSTRAINT fk_approval_delegate_org;
END;
GO

ALTER TABLE strategic_approval_delegate
ADD CONSTRAINT fk_approval_delegate_org 
    FOREIGN KEY (organization_id) REFERENCES organization(id);
GO

PRINT '  ✓ FK created successfully';
GO

-- ========================================
-- 3. department → organization
-- ========================================
PRINT 'Fixing department FK...';

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_department_organization')
BEGIN
    PRINT '  Dropping existing FK...';
    ALTER TABLE department 
    DROP CONSTRAINT FK_department_organization;
END;
GO

ALTER TABLE department
ADD CONSTRAINT FK_department_organization
    FOREIGN KEY (organization_id) REFERENCES organization(id);
GO

PRINT '  ✓ FK created successfully';
GO

-- ========================================
-- Validação Final
-- ========================================
PRINT '';
PRINT '========================================';
PRINT 'Validation: Foreign Keys Created';
PRINT '========================================';

SELECT 
    OBJECT_NAME(parent_object_id) AS [Table],
    name AS [Constraint Name],
    OBJECT_NAME(referenced_object_id) AS [References Table],
    'OK' AS [Status]
FROM sys.foreign_keys
WHERE name IN (
    'fk_approval_history_org',
    'fk_approval_delegate_org', 
    'FK_department_organization'
)
ORDER BY [Table];
GO

-- Verificar se todas foram criadas (deve retornar 3 linhas)
DECLARE @count INT;
SELECT @count = COUNT(*)
FROM sys.foreign_keys
WHERE name IN (
    'fk_approval_history_org',
    'fk_approval_delegate_org', 
    'FK_department_organization'
);

IF @count = 3
    PRINT '✓ All 3 foreign keys created successfully!';
ELSE
    RAISERROR('❌ ERROR: Expected 3 FKs, found %d', 16, 1, @count);
GO
