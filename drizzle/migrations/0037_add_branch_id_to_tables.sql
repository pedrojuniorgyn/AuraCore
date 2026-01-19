-- Migration: 0037_add_branch_id_to_tables.sql
-- Data: 2026-01-19
-- Épico: E9.1 - Multi-tenancy Compliance
-- Autor: Claude (via Cursor)
-- 
-- Descrição: Adiciona branch_id em 7 tabelas que só têm organization_id
-- 
-- IMPORTANTE: 
-- 1. Executar em horário de baixo uso
-- 2. Fazer backup antes de executar em produção
-- 3. Atualizar código para usar branch_id após migration (E9.3)
--
-- Rollback:
-- ALTER TABLE [bank_transactions] DROP COLUMN [branch_id];
-- ALTER TABLE [fuel_transactions] DROP COLUMN [branch_id];
-- ALTER TABLE [warehouse_movements] DROP COLUMN [branch_id];
-- ALTER TABLE [maintenance_work_orders] DROP COLUMN [branch_id];
-- ALTER TABLE [cost_centers] DROP COLUMN [branch_id];
-- ALTER TABLE [drivers] DROP COLUMN [branch_id];
-- ALTER TABLE [products] DROP COLUMN [branch_id];

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

PRINT '=== E9.1 - ADICIONANDO branch_id PARA MULTI-TENANCY ==='
GO

-- ============================================
-- 1. TABELAS FINANCEIRAS
-- ============================================

-- bank_transactions
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'bank_transactions' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [bank_transactions] ADD [branch_id] INT NOT NULL DEFAULT 1;
    PRINT '✅ Adicionado branch_id em bank_transactions';
END
ELSE
BEGIN
    PRINT '⏭️ bank_transactions já tem branch_id';
END
GO

-- ============================================
-- 2. TABELAS FROTA
-- ============================================

-- fuel_transactions
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'fuel_transactions' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [fuel_transactions] ADD [branch_id] INT NOT NULL DEFAULT 1;
    PRINT '✅ Adicionado branch_id em fuel_transactions';
END
ELSE
BEGIN
    PRINT '⏭️ fuel_transactions já tem branch_id';
END
GO

-- maintenance_work_orders
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'maintenance_work_orders' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [maintenance_work_orders] ADD [branch_id] INT NOT NULL DEFAULT 1;
    PRINT '✅ Adicionado branch_id em maintenance_work_orders';
END
ELSE
BEGIN
    PRINT '⏭️ maintenance_work_orders já tem branch_id';
END
GO

-- drivers
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'drivers' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [drivers] ADD [branch_id] INT NOT NULL DEFAULT 1;
    PRINT '✅ Adicionado branch_id em drivers';
END
ELSE
BEGIN
    PRINT '⏭️ drivers já tem branch_id';
END
GO

-- ============================================
-- 3. TABELAS WMS
-- ============================================

-- warehouse_movements
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouse_movements' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [warehouse_movements] ADD [branch_id] INT NOT NULL DEFAULT 1;
    PRINT '✅ Adicionado branch_id em warehouse_movements';
END
ELSE
BEGIN
    PRINT '⏭️ warehouse_movements já tem branch_id';
END
GO

-- ============================================
-- 4. TABELAS CADASTRO
-- ============================================

-- products
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [products] ADD [branch_id] INT NOT NULL DEFAULT 1;
    PRINT '✅ Adicionado branch_id em products';
END
ELSE
BEGIN
    PRINT '⏭️ products já tem branch_id';
END
GO

-- cost_centers
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'cost_centers' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [cost_centers] ADD [branch_id] INT NOT NULL DEFAULT 1;
    PRINT '✅ Adicionado branch_id em cost_centers';
END
ELSE
BEGIN
    PRINT '⏭️ cost_centers já tem branch_id';
END
GO

-- ============================================
-- 5. CRIAR ÍNDICES COMPOSTOS (MULTI-TENANCY)
-- ============================================

PRINT ''
PRINT '=== CRIANDO ÍNDICES COMPOSTOS ==='
GO

-- bank_transactions
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_transactions_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_bank_transactions_tenant] 
    ON [bank_transactions] ([organization_id], [branch_id]) 
    INCLUDE ([bank_account_id], [transaction_date], [amount]);
    PRINT '✅ Criado índice idx_bank_transactions_tenant';
END
GO

-- fuel_transactions
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fuel_transactions_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_fuel_transactions_tenant] 
    ON [fuel_transactions] ([organization_id], [branch_id]) 
    INCLUDE ([vehicle_id], [transaction_date], [total_value]);
    PRINT '✅ Criado índice idx_fuel_transactions_tenant';
END
GO

-- warehouse_movements
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_warehouse_movements_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_warehouse_movements_tenant] 
    ON [warehouse_movements] ([organization_id], [branch_id]) 
    INCLUDE ([movement_type], [product_id], [created_at]);
    PRINT '✅ Criado índice idx_warehouse_movements_tenant';
END
GO

-- maintenance_work_orders
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_maintenance_work_orders_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_maintenance_work_orders_tenant] 
    ON [maintenance_work_orders] ([organization_id], [branch_id]) 
    INCLUDE ([status], [vehicle_id], [wo_type])
    WHERE [deleted_at] IS NULL;
    PRINT '✅ Criado índice idx_maintenance_work_orders_tenant';
END
GO

-- cost_centers
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cost_centers_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_cost_centers_tenant] 
    ON [cost_centers] ([organization_id], [branch_id]) 
    INCLUDE ([code], [name], [type]);
    PRINT '✅ Criado índice idx_cost_centers_tenant';
END
GO

-- drivers
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_drivers_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_drivers_tenant] 
    ON [drivers] ([organization_id], [branch_id]) 
    INCLUDE ([name], [status], [cnh_expiry])
    WHERE [deleted_at] IS NULL;
    PRINT '✅ Criado índice idx_drivers_tenant';
END
GO

-- products
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_products_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_products_tenant] 
    ON [products] ([organization_id], [branch_id]) 
    INCLUDE ([sku], [name], [status])
    WHERE [deleted_at] IS NULL;
    PRINT '✅ Criado índice idx_products_tenant';
END
GO

-- ============================================
-- 6. TABELAS ADICIONAIS (E9.1.3)
-- ============================================

PRINT ''
PRINT '=== E9.1.3 - TABELAS ADICIONAIS ==='
GO

-- vehicles (já tem branch_id, só precisa do índice)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_vehicles_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_vehicles_tenant] 
    ON [vehicles] ([organization_id], [branch_id]) 
    INCLUDE ([plate], [type], [status])
    WHERE [deleted_at] IS NULL;
    PRINT '✅ Criado índice idx_vehicles_tenant';
END
GO

-- warehouse_locations (adicionar organization_id e branch_id)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouse_locations' AND COLUMN_NAME = 'organization_id')
BEGIN
    ALTER TABLE [warehouse_locations] ADD [organization_id] INT NOT NULL DEFAULT 1;
    PRINT '✅ Adicionado organization_id em warehouse_locations';
END
GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'warehouse_locations' AND COLUMN_NAME = 'branch_id')
BEGIN
    ALTER TABLE [warehouse_locations] ADD [branch_id] INT NOT NULL DEFAULT 1;
    PRINT '✅ Adicionado branch_id em warehouse_locations';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_warehouse_locations_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_warehouse_locations_tenant] 
    ON [warehouse_locations] ([organization_id], [branch_id]) 
    INCLUDE ([code], [status]);
    PRINT '✅ Criado índice idx_warehouse_locations_tenant';
END
GO

-- ============================================
-- 7. VERIFICAÇÃO FINAL
-- ============================================

PRINT ''
PRINT '=== VERIFICAÇÃO FINAL ==='
GO

SELECT 
    t.name AS Tabela,
    c.name AS Coluna,
    ty.name AS Tipo,
    CASE WHEN c.is_nullable = 0 THEN 'NOT NULL' ELSE 'NULL' END AS Nullable
FROM sys.tables t
INNER JOIN sys.columns c ON t.object_id = c.object_id
INNER JOIN sys.types ty ON c.user_type_id = ty.user_type_id
WHERE c.name = 'branch_id'
AND t.name IN ('bank_transactions', 'fuel_transactions', 'warehouse_movements', 
               'maintenance_work_orders', 'cost_centers', 'drivers', 'products',
               'vehicles', 'warehouse_locations')
ORDER BY t.name;
GO

SELECT 
    t.name AS Tabela,
    i.name AS Indice,
    i.type_desc AS Tipo
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.name LIKE 'idx_%_tenant'
AND t.name IN ('bank_transactions', 'fuel_transactions', 'warehouse_movements', 
               'maintenance_work_orders', 'cost_centers', 'drivers', 'products',
               'vehicles', 'warehouse_locations')
ORDER BY t.name;
GO

PRINT ''
PRINT '✅ Migration 0037_add_branch_id_to_tables concluída!'
GO
