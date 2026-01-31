-- Migration: 0048_add_strategy_version.sql
-- Task 04: Strategy Versioning - Suporte a múltiplas versões (ACTUAL, BUDGET, FORECAST, SCENARIO)
-- Referência: SAP BPC Versions, Oracle Planning Scenarios

-- Adicionar campos de versão na tabela strategy
ALTER TABLE strategic_strategy
ADD version_type VARCHAR(20) NOT NULL DEFAULT 'ACTUAL',
    version_name VARCHAR(100) NULL,
    parent_strategy_id VARCHAR(36) NULL,
    is_locked BIT NOT NULL DEFAULT 0,
    locked_at DATETIME2 NULL,
    locked_by VARCHAR(36) NULL;
GO

-- Constraint para version_type
ALTER TABLE strategic_strategy
ADD CONSTRAINT chk_strategy_version_type
    CHECK (version_type IN ('ACTUAL', 'BUDGET', 'FORECAST', 'SCENARIO'));
GO

-- FK para parent strategy (versão original)
ALTER TABLE strategic_strategy
ADD CONSTRAINT fk_strategy_parent
    FOREIGN KEY (parent_strategy_id) REFERENCES strategic_strategy(id);
GO

-- Índice para buscar versões
CREATE INDEX idx_strategy_version ON strategic_strategy(parent_strategy_id, version_type);
GO

-- Comentário: ACTUAL é a versão principal, BUDGET/FORECAST/SCENARIO são cópias para planejamento
