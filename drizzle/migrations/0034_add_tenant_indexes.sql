-- Migration: 0034_add_tenant_indexes.sql
-- Data: 2026-01-18
-- Épico: E8.1 - Performance & Observability
-- Descrição: Adiciona índices compostos (organizationId, branchId) para multi-tenancy
-- 
-- IMPORTANTE: Esta migration deve ser executada em horário de baixo uso.
-- Os índices são criados com ONLINE = ON quando possível para minimizar bloqueios.
--
-- Rollback: DROP INDEX [nome_do_indice] ON [tabela];

-- ============================================
-- ÍNDICES TENANT (organizationId, branchId)
-- ============================================

-- === FINANCEIRO ===

-- accounts_payable - Contas a pagar
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_payable_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_accounts_payable_tenant] 
    ON [accounts_payable] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_accounts_payable_tenant';
END;
GO

-- accounts_receivable - Contas a receber
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_receivable_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_accounts_receivable_tenant] 
    ON [accounts_receivable] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_accounts_receivable_tenant';
END;
GO

-- bank_accounts - Contas bancárias
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_accounts_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_bank_accounts_tenant] 
    ON [bank_accounts] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_bank_accounts_tenant';
END;
GO

-- bank_transactions - Transações bancárias
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_bank_transactions_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_bank_transactions_tenant] 
    ON [bank_transactions] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_bank_transactions_tenant';
END;
GO

-- === TMS ===

-- trips - Viagens
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trips_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_trips_tenant] 
    ON [trips] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_trips_tenant';
END;
GO

-- trip_stops - Paradas de viagem
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trip_stops_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_trip_stops_tenant] 
    ON [trip_stops] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_trip_stops_tenant';
END;
GO

-- trip_documents - Documentos de viagem
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trip_documents_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_trip_documents_tenant] 
    ON [trip_documents] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_trip_documents_tenant';
END;
GO

-- trip_checkpoints - Checkpoints de viagem
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trip_checkpoints_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_trip_checkpoints_tenant] 
    ON [trip_checkpoints] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_trip_checkpoints_tenant';
END;
GO

-- trip_occurrences - Ocorrências de viagem
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trip_occurrences_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_trip_occurrences_tenant] 
    ON [trip_occurrences] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_trip_occurrences_tenant';
END;
GO

-- cargo_documents - Documentos de carga
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cargo_documents_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_cargo_documents_tenant] 
    ON [cargo_documents] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_cargo_documents_tenant';
END;
GO

-- === FISCAL ===

-- cte_header - CT-e
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cte_header_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_cte_header_tenant] 
    ON [cte_header] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_cte_header_tenant';
END;
GO

-- mdfe_header - MDF-e
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_mdfe_header_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_mdfe_header_tenant] 
    ON [mdfe_header] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_mdfe_header_tenant';
END;
GO

-- pickup_orders - Ordens de coleta
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_pickup_orders_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_pickup_orders_tenant] 
    ON [pickup_orders] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_pickup_orders_tenant';
END;
GO

-- billing_invoices - Faturas
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_billing_invoices_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_billing_invoices_tenant] 
    ON [billing_invoices] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_billing_invoices_tenant';
END;
GO

-- inbound_invoices - NFe de entrada
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inbound_invoices_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_inbound_invoices_tenant] 
    ON [inbound_invoices] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_inbound_invoices_tenant';
END;
GO

-- fiscal_settings - Configurações fiscais
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fiscal_settings_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_fiscal_settings_tenant] 
    ON [fiscal_settings] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_fiscal_settings_tenant';
END;
GO

-- === FROTA ===

-- fuel_transactions - Abastecimentos
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_fuel_transactions_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_fuel_transactions_tenant] 
    ON [fuel_transactions] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_fuel_transactions_tenant';
END;
GO

-- maintenance_work_orders - Ordens de serviço
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_maintenance_work_orders_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_maintenance_work_orders_tenant] 
    ON [maintenance_work_orders] ([organization_id], [branch_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_maintenance_work_orders_tenant';
END;
GO

-- frota_abastecimentos - Abastecimentos (legado)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_frota_abastecimentos_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_frota_abastecimentos_tenant] 
    ON [frota_abastecimentos] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_frota_abastecimentos_tenant';
END;
GO

-- === WMS ===

-- warehouse_movements - Movimentações de estoque
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_warehouse_movements_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_warehouse_movements_tenant] 
    ON [warehouse_movements] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_warehouse_movements_tenant';
END;
GO

-- warehouse_inventory_counts - Contagens de inventário
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_warehouse_inventory_counts_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_warehouse_inventory_counts_tenant] 
    ON [warehouse_inventory_counts] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_warehouse_inventory_counts_tenant';
END;
GO

-- inventory_adjustments - Ajustes de inventário
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_inventory_adjustments_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_inventory_adjustments_tenant] 
    ON [inventory_adjustments] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_inventory_adjustments_tenant';
END;
GO

-- === CONTABILIDADE ===

-- lancamentos_contabeis - Lançamentos contábeis
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_lancamentos_contabeis_tenant')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_lancamentos_contabeis_tenant] 
    ON [lancamentos_contabeis] ([organization_id], [branch_id]);
  PRINT 'Created index: idx_lancamentos_contabeis_tenant';
END;
GO

-- ============================================
-- ÍNDICES SIMPLES (organizationId)
-- Para tabelas sem branchId
-- ============================================

-- business_partners - Parceiros de negócio
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_business_partners_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_business_partners_org] 
    ON [business_partners] ([organization_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_business_partners_org';
END;
GO

-- products - Produtos
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_products_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_products_org] 
    ON [products] ([organization_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_products_org';
END;
GO

-- financial_categories - Categorias financeiras
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_financial_categories_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_financial_categories_org] 
    ON [financial_categories] ([organization_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_financial_categories_org';
END;
GO

-- audit_logs - Logs de auditoria
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_audit_logs_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_audit_logs_org] 
    ON [audit_logs] ([organization_id]);
  PRINT 'Created index: idx_audit_logs_org';
END;
GO

-- drivers - Motoristas
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_drivers_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_drivers_org] 
    ON [drivers] ([organization_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_drivers_org';
END;
GO

-- vehicles - Veículos
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_vehicles_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_vehicles_org] 
    ON [vehicles] ([organization_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_vehicles_org';
END;
GO

-- cost_centers - Centros de custo
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cost_centers_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_cost_centers_org] 
    ON [cost_centers] ([organization_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_cost_centers_org';
END;
GO

-- chart_of_accounts - Plano de contas
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_chart_of_accounts_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_chart_of_accounts_org] 
    ON [chart_of_accounts] ([organization_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_chart_of_accounts_org';
END;
GO

-- freight_tables - Tabelas de frete
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_freight_tables_org')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_freight_tables_org] 
    ON [freight_tables] ([organization_id]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_freight_tables_org';
END;
GO

-- ============================================
-- ÍNDICES DE FILTROS FREQUENTES
-- ============================================

-- Status + Due Date para contas a pagar
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_accounts_payable_status_due')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_accounts_payable_status_due] 
    ON [accounts_payable] ([status], [due_date]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_accounts_payable_status_due';
END;
GO

-- Status + Created para viagens
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_trips_status_created')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_trips_status_created] 
    ON [trips] ([status], [created_at]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_trips_status_created';
END;
GO

-- Status + Issue Date para CT-e
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cte_header_status_issue')
BEGIN
  CREATE NONCLUSTERED INDEX [idx_cte_header_status_issue] 
    ON [cte_header] ([status], [issue_date]) 
    WHERE [deleted_at] IS NULL;
  PRINT 'Created index: idx_cte_header_status_issue';
END;
GO

-- ============================================
-- VERIFICAÇÃO
-- ============================================

-- Listar todos os índices criados
SELECT 
  t.name as TableName,
  i.name as IndexName,
  i.type_desc as IndexType,
  i.is_unique as IsUnique,
  i.filter_definition as FilterDefinition
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.name LIKE 'idx_%tenant%' 
   OR i.name LIKE 'idx_%_org'
   OR i.name LIKE 'idx_%_status%'
ORDER BY t.name, i.name;
GO

PRINT 'Migration 0034_add_tenant_indexes completed successfully.';
GO
