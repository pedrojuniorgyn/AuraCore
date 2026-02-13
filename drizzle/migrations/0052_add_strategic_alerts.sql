-- Migration: Strategic Alerts System
-- Description: Sistema de alertas automáticos para KPIs críticos e Action Plans atrasados
-- Date: 2026-02-01

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

-- Strategic Alerts Table
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_alert')
BEGIN
  CREATE TABLE strategic_alert (
      id VARCHAR(36) PRIMARY KEY,
      organization_id INT NOT NULL,
      branch_id INT NOT NULL,

      -- Alert Type
      alert_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL,

      -- Related Entity
      entity_type VARCHAR(50) NOT NULL,
      entity_id VARCHAR(36) NOT NULL,
      entity_name NVARCHAR(255) NOT NULL,

      -- Alert Details
      title NVARCHAR(255) NOT NULL,
      message NVARCHAR(MAX) NOT NULL,
      current_value DECIMAL(18,4) NULL,
      threshold_value DECIMAL(18,4) NULL,

      -- Status
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

      -- Notification Tracking
      sent_at DATETIME2 NULL,
      acknowledged_at DATETIME2 NULL,
      acknowledged_by VARCHAR(36) NULL,
      dismissed_at DATETIME2 NULL,
      dismissed_by VARCHAR(36) NULL,
      dismiss_reason NVARCHAR(500) NULL,

      -- Audit
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

      -- Constraints
      CONSTRAINT FK_strategic_alert_organization
          FOREIGN KEY (organization_id) REFERENCES organizations(id),
      CONSTRAINT FK_strategic_alert_branch
          FOREIGN KEY (branch_id) REFERENCES branches(id),
      CONSTRAINT CHK_alert_type
          CHECK (alert_type IN ('KPI_CRITICAL', 'VARIANCE_UNFAVORABLE', 'ACTION_PLAN_OVERDUE', 'GOAL_STALE')),
      CONSTRAINT CHK_severity
          CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      CONSTRAINT CHK_status
          CHECK (status IN ('PENDING', 'SENT', 'ACKNOWLEDGED', 'DISMISSED'))
  );
  PRINT 'Tabela strategic_alert criada com sucesso';
END
ELSE
BEGIN
  PRINT 'Tabela strategic_alert já existe';
END
GO

-- Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_strategic_alert_org_branch')
BEGIN
  CREATE INDEX IX_strategic_alert_org_branch ON strategic_alert(organization_id, branch_id);
  PRINT 'Índice IX_strategic_alert_org_branch criado';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_strategic_alert_status')
BEGIN
  CREATE INDEX IX_strategic_alert_status ON strategic_alert(status) WHERE status = 'PENDING';
  PRINT 'Índice IX_strategic_alert_status criado';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_strategic_alert_entity')
BEGIN
  CREATE INDEX IX_strategic_alert_entity ON strategic_alert(entity_type, entity_id);
  PRINT 'Índice IX_strategic_alert_entity criado';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_strategic_alert_created')
BEGIN
  CREATE INDEX IX_strategic_alert_created ON strategic_alert(created_at DESC);
  PRINT 'Índice IX_strategic_alert_created criado';
END
GO

-- Alert Configuration Table (thresholds per org)
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'strategic_alert_config')
BEGIN
  CREATE TABLE strategic_alert_config (
      id VARCHAR(36) PRIMARY KEY,
      organization_id INT NOT NULL,
      branch_id INT NOT NULL,

      -- KPI Thresholds
      kpi_critical_threshold DECIMAL(5,2) NOT NULL DEFAULT 70.00,
      kpi_warning_threshold DECIMAL(5,2) NOT NULL DEFAULT 85.00,

      -- Variance Thresholds
      variance_unfavorable_threshold DECIMAL(5,2) NOT NULL DEFAULT 15.00,

      -- Action Plan
      overdue_days_warning INT NOT NULL DEFAULT 3,
      overdue_days_critical INT NOT NULL DEFAULT 7,

      -- Goal Stale
      stale_days_threshold INT NOT NULL DEFAULT 14,

      -- Notification Settings
      email_enabled BIT NOT NULL DEFAULT 1,
      in_app_enabled BIT NOT NULL DEFAULT 1,
      webhook_url NVARCHAR(500) NULL,

      -- Audit
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

      CONSTRAINT FK_alert_config_organization
          FOREIGN KEY (organization_id) REFERENCES organizations(id),
      CONSTRAINT FK_alert_config_branch
          FOREIGN KEY (branch_id) REFERENCES branches(id),
      CONSTRAINT UQ_alert_config_org_branch
          UNIQUE (organization_id, branch_id)
  );
  PRINT 'Tabela strategic_alert_config criada com sucesso';
END
ELSE
BEGIN
  PRINT 'Tabela strategic_alert_config já existe';
END
GO
