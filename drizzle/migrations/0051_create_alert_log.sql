-- Migration: Create Alert Log Table
-- Description: Sistema de alertas automáticos para KPI/Anomaly/Variance/Action Plans
-- Date: 2026-01-31

-- Tabela para armazenar alertas gerados
CREATE TABLE strategic_alert_log (
    id VARCHAR(36) PRIMARY KEY,
    organization_id INT NOT NULL,
    branch_id INT NOT NULL,

    alert_type VARCHAR(50) NOT NULL, -- 'KPI_CRITICAL' | 'ANOMALY_HIGH' | 'VARIANCE_UNFAVORABLE' | 'ACTION_PLAN_OVERDUE'
    severity VARCHAR(20) NOT NULL,   -- 'INFO' | 'WARNING' | 'CRITICAL'

    entity_type VARCHAR(50) NOT NULL, -- 'KPI' | 'ANOMALY' | 'ACTION_PLAN' | 'VARIANCE'
    entity_id VARCHAR(36) NOT NULL,
    entity_code VARCHAR(50) NULL,
    entity_name VARCHAR(200) NULL,

    title VARCHAR(200) NOT NULL,
    message NVARCHAR(1000) NOT NULL,

    -- Destinatários
    notify_user_ids NVARCHAR(MAX) NULL, -- JSON array de user IDs
    notify_emails NVARCHAR(MAX) NULL,   -- JSON array de emails

    -- Status do alerta
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'RESOLVED'
    acknowledged_at DATETIME2 NULL,
    acknowledged_by VARCHAR(36) NULL,
    resolved_at DATETIME2 NULL,
    resolved_by VARCHAR(36) NULL,

    -- Metadata
    metadata NVARCHAR(MAX) NULL, -- JSON com dados adicionais

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    INDEX idx_alert_log_tenant (organization_id, branch_id),
    INDEX idx_alert_log_status (status),
    INDEX idx_alert_log_type (alert_type),
    INDEX idx_alert_log_entity (entity_type, entity_id)
);
GO
