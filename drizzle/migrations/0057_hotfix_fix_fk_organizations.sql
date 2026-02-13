-- ========================================
-- Hotfix 0057: Fix Invalid FK References
-- ========================================
-- BUG-021: Foreign keys referenciando 'organization' (singular) em vez de 'organizations' (plural)
-- Causa: Inconsistência em nomes de tabelas em migrations 0053 e 0054
-- Impacto: Constraints não criadas (silent fail), integridade referencial comprometida
-- Data: 2026-02-02
--
-- HOTFIX 2026-02-13: Tornada fully idempotent (IF EXISTS checks em todas as tabelas)
--   para evitar falha quando department ainda não existe (criada por 0076)

-- ========================================
-- 1. strategic_approval_history → organization
-- ========================================
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_approval_history')
BEGIN
    PRINT 'Fixing strategic_approval_history FK...';

    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_approval_history_org')
    BEGIN
        PRINT '  Dropping existing FK...';
        ALTER TABLE strategic_approval_history 
        DROP CONSTRAINT fk_approval_history_org;
    END;

    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_approval_history_org')
    BEGIN
        ALTER TABLE strategic_approval_history
        ADD CONSTRAINT fk_approval_history_org 
            FOREIGN KEY (organization_id) REFERENCES organizations(id);
        PRINT '  ✓ FK created successfully';
    END;
END
ELSE
BEGIN
    PRINT 'SKIP: strategic_approval_history does not exist yet (will be created by 0076)';
END;
GO

-- ========================================
-- 2. strategic_approval_delegate → organizations
-- ========================================
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_approval_delegate')
BEGIN
    PRINT 'Fixing strategic_approval_delegate FK...';

    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_approval_delegate_org')
    BEGIN
        PRINT '  Dropping existing FK...';
        ALTER TABLE strategic_approval_delegate 
        DROP CONSTRAINT fk_approval_delegate_org;
    END;

    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'fk_approval_delegate_org')
    BEGIN
        ALTER TABLE strategic_approval_delegate
        ADD CONSTRAINT fk_approval_delegate_org 
            FOREIGN KEY (organization_id) REFERENCES organizations(id);
        PRINT '  ✓ FK created successfully';
    END;
END
ELSE
BEGIN
    PRINT 'SKIP: strategic_approval_delegate does not exist yet';
END;
GO

-- ========================================
-- 3. department → organizations
-- ========================================
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'department')
BEGIN
    PRINT 'Fixing department FK...';

    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_department_organization')
    BEGIN
        PRINT '  Dropping existing FK...';
        ALTER TABLE department 
        DROP CONSTRAINT FK_department_organization;
    END;

    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_department_organization')
    BEGIN
        ALTER TABLE department
        ADD CONSTRAINT FK_department_organization
            FOREIGN KEY (organization_id) REFERENCES organizations(id);
        PRINT '  ✓ FK created successfully';
    END;
END
ELSE
BEGIN
    PRINT 'SKIP: department does not exist yet (will be created by 0076)';
END;
GO

-- ========================================
-- Validação Final (informativa, sem RAISERROR)
-- ========================================
PRINT '';
PRINT '========================================';
PRINT 'Validation: Foreign Keys Status';
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

DECLARE @count INT;
SELECT @count = COUNT(*)
FROM sys.foreign_keys
WHERE name IN (
    'fk_approval_history_org',
    'fk_approval_delegate_org', 
    'FK_department_organization'
);

IF @count = 3
    PRINT '✓ All 3 foreign keys exist.';
ELSE
    PRINT '⚠️  Only ' + CAST(@count AS VARCHAR(10)) + '/3 FKs exist. Missing FKs will be created when dependent tables are available.';
GO
