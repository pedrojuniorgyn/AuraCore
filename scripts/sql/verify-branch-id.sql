-- ==================================================================
-- VERIFICAÇÃO: Tabelas sem branch_id
-- ==================================================================
-- Executar ANTES e DEPOIS do fix para confirmar correção
-- ==================================================================

USE AuraCore;
GO

PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '📊 DIAGNÓSTICO: Tabelas sem branch_id';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '';

-- Contagem total
DECLARE @total INT, @com_branch INT, @sem_branch INT;

SELECT @total = COUNT(*) FROM sys.tables WHERE name NOT IN ('__drizzle_migrations', '__EFMigrationsHistory', 'sysdiagrams');

SELECT @com_branch = COUNT(DISTINCT t.name)
FROM sys.tables t
INNER JOIN sys.columns c ON c.object_id = t.object_id AND c.name = 'branch_id'
WHERE t.name NOT IN ('__drizzle_migrations', '__EFMigrationsHistory', 'sysdiagrams');

SET @sem_branch = @total - @com_branch;

PRINT 'Total de tabelas: ' + CAST(@total AS VARCHAR);
PRINT 'Com branch_id: ' + CAST(@com_branch AS VARCHAR);
PRINT 'SEM branch_id: ' + CAST(@sem_branch AS VARCHAR);
PRINT '';

-- Lista detalhada
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '📋 Tabelas SEM branch_id (precisam correção):';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT 
  t.name AS TableName,
  CASE 
    WHEN EXISTS (SELECT 1 FROM sys.columns c WHERE c.object_id = t.object_id AND c.name = 'organization_id')
    THEN 'TEM org_id'
    ELSE 'SEM org_id'
  END AS OrgIdStatus
FROM sys.tables t
WHERE t.name NOT IN ('__drizzle_migrations', '__EFMigrationsHistory', 'sysdiagrams')
  AND NOT EXISTS (
    SELECT 1 FROM sys.columns c 
    WHERE c.object_id = t.object_id 
    AND c.name = 'branch_id'
  )
ORDER BY t.name;

PRINT '';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
PRINT '✅ Tabelas COM branch_id (OK):';
PRINT '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT t.name AS TableName
FROM sys.tables t
INNER JOIN sys.columns c ON c.object_id = t.object_id AND c.name = 'branch_id'
WHERE t.name NOT IN ('__drizzle_migrations', '__EFMigrationsHistory', 'sysdiagrams')
ORDER BY t.name;

GO
