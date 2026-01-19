-- Migration: 0036_fix_tenant_indexes.sql
-- Data: 2026-01-19
-- Épico: E8.4 - Fix Tenant Indexes
-- Descrição: Correção da migration 0034 - Remove índices para tabelas sem colunas necessárias
-- 
-- PROBLEMA: A migration 0034 tentava criar índices em colunas que não existem:
-- - bank_transactions: não tem branch_id nem deleted_at
-- - trip_stops, trip_documents, trip_checkpoints: não têm organization_id nem branch_id
-- - fuel_transactions, warehouse_movements, etc: não têm branch_id
--
-- SOLUÇÃO: 
-- 1. Remover índices inválidos da 0034 (se existirem)
-- 2. Criar apenas índices válidos baseados no schema real
--
-- Rollback: DROP INDEX [nome_do_indice] ON [tabela];

-- ============================================
-- PASSO 1: REMOVER ÍNDICES INVÁLIDOS (SE EXISTIREM)
-- ============================================

-- Índices que referenciam colunas inexistentes
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_transactions_tenant')
BEGIN
  DROP INDEX [idx_bank_transactions_tenant] ON [bank_transactions];
  PRINT 'Dropped invalid index: idx_bank_transactions_tenant';
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trip_stops_tenant')
BEGIN
  DROP INDEX [idx_trip_stops_tenant] ON [trip_stops];
  PRINT 'Dropped invalid index: idx_trip_stops_tenant';
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trip_documents_tenant')
BEGIN
  DROP INDEX [idx_trip_documents_tenant] ON [trip_documents];
  PRINT 'Dropped invalid index: idx_trip_documents_tenant';
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trip_checkpoints_tenant')
BEGIN
  DROP INDEX [idx_trip_checkpoints_tenant] ON [trip_checkpoints];
  PRINT 'Dropped invalid index: idx_trip_checkpoints_tenant';
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fuel_transactions_tenant')
BEGIN
  DROP INDEX [idx_fuel_transactions_tenant] ON [fuel_transactions];
  PRINT 'Dropped invalid index: idx_fuel_transactions_tenant';
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_maintenance_work_orders_tenant')
BEGIN
  DROP INDEX [idx_maintenance_work_orders_tenant] ON [maintenance_work_orders];
  PRINT 'Dropped invalid index: idx_maintenance_work_orders_tenant';
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_warehouse_movements_tenant')
BEGIN
  DROP INDEX [idx_warehouse_movements_tenant] ON [warehouse_movements];
  PRINT 'Dropped invalid index: idx_warehouse_movements_tenant';
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_warehouse_inventory_counts_tenant')
BEGIN
  DROP INDEX [idx_warehouse_inventory_counts_tenant] ON [warehouse_inventory_counts];
  PRINT 'Dropped invalid index: idx_warehouse_inventory_counts_tenant';
END;
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inventory_adjustments_tenant')
BEGIN
  DROP INDEX [idx_inventory_adjustments_tenant] ON [inventory_adjustments];
  PRINT 'Dropped invalid index: idx_inventory_adjustments_tenant';
END;
GO

-- ============================================
-- PASSO 2: CRIAR ÍNDICES CORRIGIDOS
-- ============================================

-- === TABELAS COM APENAS organization_id (SEM branch_id) ===

-- bank_transactions - índice simples (sem branch_id, sem deleted_at)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_transactions_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_bank_transactions_org] 
    ON [bank_transactions] ([organization_id]) 
    INCLUDE ([bank_account_id], [transaction_date], [amount]);
  PRINT 'Created index: idx_bank_transactions_org';
END;
GO

-- fuel_transactions - índice simples (sem branch_id, sem deleted_at)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fuel_transactions_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_fuel_transactions_org] 
    ON [fuel_transactions] ([organization_id]) 
    INCLUDE ([vehicle_id], [transaction_date], [total_value]);
  PRINT 'Created index: idx_fuel_transactions_org';
END;
GO

-- maintenance_work_orders - índice simples (sem branch_id, mas COM deleted_at)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_maintenance_work_orders_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_maintenance_work_orders_org] 
    ON [maintenance_work_orders] ([organization_id]) 
    INCLUDE ([status], [vehicle_id], [wo_type])
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_maintenance_work_orders_org';
END;
GO

-- warehouse_movements - índice simples (sem branch_id, sem deleted_at)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_warehouse_movements_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_warehouse_movements_org] 
    ON [warehouse_movements] ([organization_id]) 
    INCLUDE ([movement_type], [product_id], [created_at]);
  PRINT 'Created index: idx_warehouse_movements_org';
END;
GO

-- warehouse_inventory_counts - índice simples (sem branch_id, sem deleted_at)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_warehouse_inventory_counts_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_warehouse_inventory_counts_org] 
    ON [warehouse_inventory_counts] ([organization_id]) 
    INCLUDE ([status], [count_date], [warehouse_id]);
  PRINT 'Created index: idx_warehouse_inventory_counts_org';
END;
GO

-- inventory_adjustments - índice simples (sem branch_id, sem deleted_at)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inventory_adjustments_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_inventory_adjustments_org] 
    ON [inventory_adjustments] ([organization_id]) 
    INCLUDE ([adjustment_date], [product_id], [reason]);
  PRINT 'Created index: idx_inventory_adjustments_org';
END;
GO

-- === TABELAS SEM organization_id E SEM branch_id (índice por FK) ===

-- trip_stops - índice por trip_id (não tem org/branch)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trip_stops_trip')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_trip_stops_trip] 
    ON [trip_stops] ([trip_id]) 
    INCLUDE ([stop_type], [status], [sequence])
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_trip_stops_trip';
END;
GO

-- trip_documents - índice por trip_id (não tem org/branch)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trip_documents_trip')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_trip_documents_trip] 
    ON [trip_documents] ([trip_id]) 
    INCLUDE ([document_type], [cte_id])
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_trip_documents_trip';
END;
GO

-- trip_checkpoints - índice por trip_id (não tem org/branch, sem deleted_at)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trip_checkpoints_trip')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_trip_checkpoints_trip] 
    ON [trip_checkpoints] ([trip_id]) 
    INCLUDE ([checkpoint_type], [recorded_at]);
  PRINT 'Created index: idx_trip_checkpoints_trip';
END;
GO

-- === CORRIGIR fiscal_settings (TEM branch_id, mas SEM deleted_at) ===

-- Remover índice antigo se existir (com WHERE deleted_at)
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_settings_tenant')
BEGIN
  DROP INDEX [idx_fiscal_settings_tenant] ON [fiscal_settings];
  PRINT 'Dropped index with incorrect filter: idx_fiscal_settings_tenant';
END;
GO

-- Criar índice correto (SEM WHERE deleted_at, pois coluna não existe)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_settings_tenant_v2')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_fiscal_settings_tenant_v2] 
    ON [fiscal_settings] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_fiscal_settings_tenant_v2';
END;
GO

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Listar índices criados/corrigidos
SELECT 
  t.name as TableName,
  i.name as IndexName,
  i.type_desc as IndexType,
  i.filter_definition as FilterDefinition,
  STUFF((
    SELECT ', ' + c.name
    FROM sys.index_columns ic
    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
    ORDER BY ic.key_ordinal
    FOR XML PATH('')
  ), 1, 2, '') as KeyColumns
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.name IN (
  'idx_bank_transactions_org',
  'idx_fuel_transactions_org',
  'idx_maintenance_work_orders_org',
  'idx_warehouse_movements_org',
  'idx_warehouse_inventory_counts_org',
  'idx_inventory_adjustments_org',
  'idx_trip_stops_trip',
  'idx_trip_documents_trip',
  'idx_trip_checkpoints_trip',
  'idx_fiscal_settings_tenant_v2'
)
ORDER BY t.name, i.name;
GO

PRINT 'Migration 0036_fix_tenant_indexes completed successfully.';
GO
