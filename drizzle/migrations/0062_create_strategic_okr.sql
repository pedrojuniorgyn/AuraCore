-- Migration: 0062_create_strategic_okr.sql
-- Data: 2026-02-05
-- Épico: E8 - Gestão Estratégica (OKRs)
-- Autor: AuraCore Enterprise
--
-- Descrição: Cria tabelas para módulo OKR (Objectives and Key Results)
-- Tabelas: strategic_okr, strategic_okr_key_result
--
-- IMPORTANTE: Testar em ambiente local antes de executar em homolog/prod
-- Rollback: Ver ROLLBACK abaixo

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- ============================================
-- Tabela: strategic_okr
-- ============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_okr')
BEGIN
    CREATE TABLE [strategic_okr] (
        [id] VARCHAR(36) NOT NULL PRIMARY KEY,
        
        -- Identification
        [title] VARCHAR(200) NOT NULL,
        [description] TEXT NULL,
        
        -- Hierarchy
        [level] VARCHAR(20) NOT NULL, -- corporate | department | team | individual
        [parent_id] VARCHAR(36) NULL,
        
        -- Period
        [period_type] VARCHAR(20) NOT NULL, -- quarter | semester | year | custom
        [period_label] VARCHAR(100) NOT NULL,
        [start_date] DATETIME2 NOT NULL,
        [end_date] DATETIME2 NOT NULL,
        
        -- Owner
        [owner_id] VARCHAR(36) NOT NULL,
        [owner_name] VARCHAR(200) NOT NULL,
        [owner_type] VARCHAR(20) NOT NULL, -- user | team | department
        
        -- Progress & Status
        [progress] INT NOT NULL DEFAULT 0, -- 0-100
        [status] VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft | active | completed | cancelled
        
        -- Multi-tenancy (SCHEMA-003)
        [organization_id] INT NOT NULL,
        [branch_id] INT NOT NULL,
        
        -- Audit
        [created_by] VARCHAR(36) NOT NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [deleted_at] DATETIME2 NULL,
        
        -- Self-reference FK
        CONSTRAINT [fk_strategic_okr_parent] FOREIGN KEY ([parent_id])
            REFERENCES [strategic_okr]([id])
    );
    PRINT 'Tabela strategic_okr criada com sucesso';
END
ELSE
BEGIN
    PRINT 'Tabela strategic_okr já existe';
END
GO

-- ============================================
-- Índices: strategic_okr
-- ============================================

-- SCHEMA-003: Índice composto obrigatório para multi-tenancy
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_okr_tenant')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_okr_tenant]
    ON [strategic_okr] ([organization_id], [branch_id])
    WHERE [deleted_at] IS NULL;
    PRINT 'Índice idx_strategic_okr_tenant criado';
END
GO

-- Índice para hierarquia (parent)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_okr_parent')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_okr_parent]
    ON [strategic_okr] ([parent_id])
    WHERE [deleted_at] IS NULL;
    PRINT 'Índice idx_strategic_okr_parent criado';
END
GO

-- Índice para filtro por nível
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_okr_level')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_okr_level]
    ON [strategic_okr] ([level])
    WHERE [deleted_at] IS NULL;
    PRINT 'Índice idx_strategic_okr_level criado';
END
GO

-- Índice para filtro por owner
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_okr_owner')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_okr_owner]
    ON [strategic_okr] ([owner_id])
    WHERE [deleted_at] IS NULL;
    PRINT 'Índice idx_strategic_okr_owner criado';
END
GO

-- Índice para filtro por status
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_okr_status')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_okr_status]
    ON [strategic_okr] ([status])
    WHERE [deleted_at] IS NULL;
    PRINT 'Índice idx_strategic_okr_status criado';
END
GO

-- Índice para busca por período
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_okr_period')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_okr_period]
    ON [strategic_okr] ([period_type], [start_date], [end_date])
    WHERE [deleted_at] IS NULL;
    PRINT 'Índice idx_strategic_okr_period criado';
END
GO

-- ============================================
-- Tabela: strategic_okr_key_result
-- ============================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'strategic_okr_key_result')
BEGIN
    CREATE TABLE [strategic_okr_key_result] (
        [id] VARCHAR(36) NOT NULL PRIMARY KEY,
        
        -- FK
        [okr_id] VARCHAR(36) NOT NULL,
        
        -- Key Result Data
        [title] VARCHAR(200) NOT NULL,
        [description] TEXT NULL,
        [metric_type] VARCHAR(20) NOT NULL, -- number | percentage | currency | boolean
        [start_value] INT NOT NULL,
        [target_value] INT NOT NULL,
        [current_value] INT NOT NULL DEFAULT 0,
        [unit] VARCHAR(50) NULL,
        [status] VARCHAR(20) NOT NULL DEFAULT 'not_started', -- not_started | on_track | at_risk | behind | completed
        [weight] INT NOT NULL DEFAULT 100, -- 0-100
        [order_index] INT NOT NULL DEFAULT 0,
        
        -- Links (opcional)
        [linked_kpi_id] VARCHAR(36) NULL,
        [linked_action_plan_id] VARCHAR(36) NULL,
        
        -- Audit
        [created_by] VARCHAR(36) NULL,
        [updated_by] VARCHAR(36) NULL,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        
        -- FK Constraint
        CONSTRAINT [fk_strategic_okr_key_result_okr] FOREIGN KEY ([okr_id])
            REFERENCES [strategic_okr]([id])
            ON DELETE CASCADE
    );
    PRINT 'Tabela strategic_okr_key_result criada com sucesso';
END
ELSE
BEGIN
    PRINT 'Tabela strategic_okr_key_result já existe';
END
GO

-- ============================================
-- Índices: strategic_okr_key_result
-- ============================================

-- Índice para FK (buscar KRs por OKR)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_okr_key_result_okr')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_okr_key_result_okr]
    ON [strategic_okr_key_result] ([okr_id]);
    PRINT 'Índice idx_strategic_okr_key_result_okr criado';
END
GO

-- Índice para filtro por status
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_strategic_okr_key_result_status')
BEGIN
    CREATE NONCLUSTERED INDEX [idx_strategic_okr_key_result_status]
    ON [strategic_okr_key_result] ([status]);
    PRINT 'Índice idx_strategic_okr_key_result_status criado';
END
GO

-- ============================================
-- Confirmação
-- ============================================
PRINT '';
PRINT '============================================';
PRINT 'Migration 0062_create_strategic_okr.sql CONCLUÍDA';
PRINT '============================================';
PRINT 'Tabelas criadas:';
PRINT '  - strategic_okr (OKRs principais)';
PRINT '  - strategic_okr_key_result (Key Results)';
PRINT '';
PRINT 'Índices criados: 8';
PRINT '  - idx_strategic_okr_tenant (multi-tenancy)';
PRINT '  - idx_strategic_okr_parent (hierarquia)';
PRINT '  - idx_strategic_okr_level';
PRINT '  - idx_strategic_okr_owner';
PRINT '  - idx_strategic_okr_status';
PRINT '  - idx_strategic_okr_period';
PRINT '  - idx_strategic_okr_key_result_okr (FK)';
PRINT '  - idx_strategic_okr_key_result_status';
GO

-- ============================================
-- ROLLBACK (executar se necessário reverter)
-- ============================================
/*
-- Para reverter esta migration, execute:

DROP INDEX IF EXISTS [idx_strategic_okr_key_result_status] ON [strategic_okr_key_result];
DROP INDEX IF EXISTS [idx_strategic_okr_key_result_okr] ON [strategic_okr_key_result];
DROP TABLE IF EXISTS [strategic_okr_key_result];

DROP INDEX IF EXISTS [idx_strategic_okr_period] ON [strategic_okr];
DROP INDEX IF EXISTS [idx_strategic_okr_status] ON [strategic_okr];
DROP INDEX IF EXISTS [idx_strategic_okr_owner] ON [strategic_okr];
DROP INDEX IF EXISTS [idx_strategic_okr_level] ON [strategic_okr];
DROP INDEX IF EXISTS [idx_strategic_okr_parent] ON [strategic_okr];
DROP INDEX IF EXISTS [idx_strategic_okr_tenant] ON [strategic_okr];
DROP TABLE IF EXISTS [strategic_okr];

PRINT 'Rollback da migration 0062 concluído';
*/
