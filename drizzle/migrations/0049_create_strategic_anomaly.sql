-- Migration: 0049_create_strategic_anomaly.sql
-- Fase 5: Criar tabela de Anomalias (Metodologia GEROT/Falconi)
-- Desvio não desejado que requer tratamento com análise 5 Porquês

CREATE TABLE strategic_anomaly (
    id VARCHAR(36) PRIMARY KEY,
    organization_id INT NOT NULL,
    branch_id INT NOT NULL,

    code VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,

    -- Origem da anomalia
    source VARCHAR(20) NOT NULL, -- CONTROL_ITEM|KPI|MANUAL|AUDIT
    source_entity_id VARCHAR(36) NULL,

    -- Detecção
    detected_at DATETIME2 NOT NULL,
    detected_by VARCHAR(36) NOT NULL,

    -- Classificação
    severity VARCHAR(20) NOT NULL, -- LOW|MEDIUM|HIGH|CRITICAL
    process_area VARCHAR(100) NOT NULL,
    responsible_user_id VARCHAR(36) NOT NULL,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN|ANALYZING|IN_TREATMENT|RESOLVED|CANCELLED

    -- Análise de causa raiz (5 Porquês)
    root_cause_analysis NVARCHAR(MAX) NULL,
    why1 VARCHAR(500) NULL,
    why2 VARCHAR(500) NULL,
    why3 VARCHAR(500) NULL,
    why4 VARCHAR(500) NULL,
    why5 VARCHAR(500) NULL,
    root_cause VARCHAR(500) NULL,

    -- Tratamento
    action_plan_id VARCHAR(36) NULL,
    standard_procedure_id VARCHAR(36) NULL,

    -- Resolução
    resolution NVARCHAR(MAX) NULL,
    resolved_at DATETIME2 NULL,
    resolved_by VARCHAR(36) NULL,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL,

    -- FKs
    CONSTRAINT fk_anomaly_action_plan FOREIGN KEY (action_plan_id) REFERENCES strategic_action_plan(id),
    CONSTRAINT fk_anomaly_standard_procedure FOREIGN KEY (standard_procedure_id) REFERENCES strategic_standard_procedure(id),

    -- Check constraints
    CONSTRAINT chk_anomaly_source CHECK (source IN ('CONTROL_ITEM', 'KPI', 'MANUAL', 'AUDIT')),
    CONSTRAINT chk_anomaly_severity CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT chk_anomaly_status CHECK (status IN ('OPEN', 'ANALYZING', 'IN_TREATMENT', 'RESOLVED', 'CANCELLED'))
);
GO

-- Índices
CREATE INDEX idx_anomaly_tenant ON strategic_anomaly(organization_id, branch_id);
CREATE INDEX idx_anomaly_status ON strategic_anomaly(status);
CREATE INDEX idx_anomaly_severity ON strategic_anomaly(severity);
CREATE INDEX idx_anomaly_source ON strategic_anomaly(source);
CREATE INDEX idx_anomaly_responsible ON strategic_anomaly(responsible_user_id);
GO

-- View de resumo de anomalias
CREATE VIEW vw_anomalies_summary AS
SELECT
    a.organization_id,
    a.branch_id,
    a.severity,
    a.status,
    COUNT(a.id) AS total_count,
    AVG(DATEDIFF(day, a.detected_at, COALESCE(a.resolved_at, GETDATE()))) AS avg_resolution_days
FROM strategic_anomaly a
WHERE a.deleted_at IS NULL
GROUP BY a.organization_id, a.branch_id, a.severity, a.status;
GO
