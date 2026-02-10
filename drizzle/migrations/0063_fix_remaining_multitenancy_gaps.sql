-- Migration: 0063_fix_remaining_multitenancy_gaps.sql
-- Data: 2026-02-08
-- Epico: E9.2 - Multi-tenancy Compliance (Remaining Gaps)
-- Autor: Diagnostic Plan Implementation
--
-- Descricao: Corrige as 2 tabelas restantes sem branch_id e adiciona
--            deleted_at/updated_at onde ausente (SCHEMA-003, SCHEMA-005, SCHEMA-006)
--
-- Tabelas afetadas:
-- 1. wms_inventory_counts   - Adicionar branch_id, deleted_at
-- 2. inventory_adjustments  - Adicionar branch_id, updated_at, deleted_at
--
-- IMPORTANTE:
-- 1. Executar em horario de baixo uso
-- 2. Fazer backup antes de executar em producao
--
-- Rollback:
-- ALTER TABLE [wms_inventory_counts] DROP COLUMN [branch_id];
-- ALTER TABLE [wms_inventory_counts] DROP COLUMN [deleted_at];
-- ALTER TABLE [inventory_adjustments] DROP COLUMN [branch_id];
-- ALTER TABLE [inventory_adjustments] DROP COLUMN [updated_at];
-- ALTER TABLE [inventory_adjustments] DROP COLUMN [deleted_at];

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '=== 0063 - CORRIGINDO GAPS MULTI-TENANCY RESTANTES ==='
GO

-- ============================================
-- 1. wms_inventory_counts
-- ============================================

-- branch_id
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wms_inventory_counts' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [wms_inventory_counts] ADD [branch_id] INT NOT NULL DEFAULT 1;
    PRINT 'Adicionado branch_id em wms_inventory_counts';
END
ELSE
BEGIN
    PRINT 'wms_inventory_counts ja tem branch_id';
END
GO

-- deleted_at
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'wms_inventory_counts' AND COLUMN_NAME = 'deleted_at')
BEGIN
    ALTER TABLE [wms_inventory_counts] ADD [deleted_at] DATETIME2 NULL;
    PRINT 'Adicionado deleted_at em wms_inventory_counts';
END
GO

-- Indice composto multi-tenancy (SCHEMA-003)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wms_inventory_counts_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_wms_inventory_counts_tenant]
    ON [wms_inventory_counts] ([organization_id], [branch_id])
    INCLUDE ([status], [count_type], [count_date])
    WHERE [deleted_at] IS NULL;
    PRINT 'Criado indice idx_wms_inventory_counts_tenant';
END
GO

-- ============================================
-- 2. inventory_adjustments
-- ============================================

-- branch_id
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_adjustments' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [inventory_adjustments] ADD [branch_id] INT NOT NULL DEFAULT 1;
    PRINT 'Adicionado branch_id em inventory_adjustments';
END
ELSE
BEGIN
    PRINT 'inventory_adjustments ja tem branch_id';
END
GO

-- updated_at
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_adjustments' AND COLUMN_NAME = 'updated_at')
BEGIN
    ALTER TABLE [inventory_adjustments] ADD [updated_at] DATETIME2 NULL DEFAULT GETDATE();
    PRINT 'Adicionado updated_at em inventory_adjustments';
END
GO

-- deleted_at
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'inventory_adjustments' AND COLUMN_NAME = 'deleted_at')
BEGIN
    ALTER TABLE [inventory_adjustments] ADD [deleted_at] DATETIME2 NULL;
    PRINT 'Adicionado deleted_at em inventory_adjustments';
END
GO

-- Indice composto multi-tenancy (SCHEMA-003)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inventory_adjustments_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_inventory_adjustments_tenant]
    ON [inventory_adjustments] ([organization_id], [branch_id])
    INCLUDE ([product_id], [reason], [adjustment_date])
    WHERE [deleted_at] IS NULL;
    PRINT 'Criado indice idx_inventory_adjustments_tenant';
END
GO

-- ============================================
-- POPULAR branch_id com dados existentes
-- ============================================

PRINT ''
PRINT '=== POPULANDO branch_id COM DADOS EXISTENTES ==='
GO

-- wms_inventory_counts
UPDATE t
SET t.branch_id = b.id
FROM [wms_inventory_counts] t
CROSS APPLY (
    SELECT TOP 1 id FROM branches
    WHERE organization_id = t.organization_id
    ORDER BY is_headquarters DESC
) b
WHERE t.branch_id = 1
AND EXISTS (SELECT 1 FROM branches WHERE organization_id = t.organization_id AND id <> 1);
GO

-- inventory_adjustments
UPDATE t
SET t.branch_id = b.id
FROM [inventory_adjustments] t
CROSS APPLY (
    SELECT TOP 1 id FROM branches
    WHERE organization_id = t.organization_id
    ORDER BY is_headquarters DESC
) b
WHERE t.branch_id = 1
AND EXISTS (SELECT 1 FROM branches WHERE organization_id = t.organization_id AND id <> 1);
GO

-- ============================================
-- VERIFICACAO FINAL
-- ============================================

PRINT ''
PRINT '=== VERIFICACAO FINAL ==='
GO

SELECT
    t.name AS Tabela,
    c.name AS Coluna,
    ty.name AS Tipo,
    CASE WHEN c.is_nullable = 0 THEN 'NOT NULL' ELSE 'NULL' END AS Nullable
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE c.name IN ('branch_id', 'deleted_at', 'updated_at')
AND t.name IN ('wms_inventory_counts', 'inventory_adjustments')
ORDER BY t.name, c.name;
GO

SELECT
    t.name AS Tabela,
    i.name AS Indice,
    i.type_desc AS Tipo
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.name LIKE 'idx_%_tenant'
AND t.name IN ('wms_inventory_counts', 'inventory_adjustments')
ORDER BY t.name;
GO

PRINT ''
PRINT 'Migration 0063_fix_remaining_multitenancy_gaps concluida!';
GO
