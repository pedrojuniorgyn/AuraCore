-- Migration: 0047_add_kpi_value_versions.sql
-- Task 03: Variance Analysis - Estrutura para comparar ACTUAL vs BUDGET vs FORECAST
-- Referência: SAP BPC Variance Reports, Oracle EPBCS

-- Tabela para armazenar valores de KPI por versão (ACTUAL, BUDGET, FORECAST)
CREATE TABLE strategic_kpi_value_version (
    id VARCHAR(36) PRIMARY KEY,
    organization_id INT NOT NULL,
    branch_id INT NOT NULL,
    kpi_id VARCHAR(36) NOT NULL,
    version_type VARCHAR(20) NOT NULL, -- 'ACTUAL' | 'BUDGET' | 'FORECAST'
    period_year INT NOT NULL,
    period_month INT NOT NULL,
    value DECIMAL(18, 4) NOT NULL,
    notes NVARCHAR(500) NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL,

    CONSTRAINT fk_kpi_value_version_kpi
        FOREIGN KEY (kpi_id) REFERENCES strategic_kpi(id),
    CONSTRAINT chk_version_type
        CHECK (version_type IN ('ACTUAL', 'BUDGET', 'FORECAST'))
);

-- Índices
CREATE INDEX idx_kpi_value_version_tenant ON strategic_kpi_value_version(organization_id, branch_id);
CREATE INDEX idx_kpi_value_version_kpi ON strategic_kpi_value_version(kpi_id);
CREATE INDEX idx_kpi_value_version_period ON strategic_kpi_value_version(period_year, period_month);
CREATE UNIQUE INDEX idx_kpi_value_version_unique ON strategic_kpi_value_version(kpi_id, version_type, period_year, period_month) WHERE deleted_at IS NULL;

-- Tabela para armazenar targets de Goal por versão
CREATE TABLE strategic_goal_value_version (
    id VARCHAR(36) PRIMARY KEY,
    organization_id INT NOT NULL,
    branch_id INT NOT NULL,
    goal_id VARCHAR(36) NOT NULL,
    version_type VARCHAR(20) NOT NULL, -- 'ACTUAL' | 'BUDGET' | 'FORECAST'
    period_year INT NOT NULL,
    period_quarter INT NULL, -- NULL = annual, 1-4 = quarterly
    target_value DECIMAL(18, 4) NOT NULL,
    current_value DECIMAL(18, 4) NULL,
    notes NVARCHAR(500) NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    deleted_at DATETIME2 NULL,

    CONSTRAINT fk_goal_value_version_goal
        FOREIGN KEY (goal_id) REFERENCES strategic_goal(id),
    CONSTRAINT chk_goal_version_type
        CHECK (version_type IN ('ACTUAL', 'BUDGET', 'FORECAST'))
);

CREATE INDEX idx_goal_value_version_tenant ON strategic_goal_value_version(organization_id, branch_id);
CREATE INDEX idx_goal_value_version_goal ON strategic_goal_value_version(goal_id);

-- View para análise de variância KPI
CREATE VIEW vw_kpi_variance_analysis AS
SELECT
    a.organization_id,
    a.branch_id,
    a.kpi_id,
    k.code AS kpi_code,
    k.name AS kpi_name,
    k.polarity,
    a.period_year,
    a.period_month,
    a.value AS actual_value,
    b.value AS budget_value,
    f.value AS forecast_value,
    -- Variance Actual vs Budget
    (a.value - b.value) AS variance_actual_budget,
    CASE WHEN b.value != 0 THEN ((a.value - b.value) / b.value) * 100 ELSE 0 END AS variance_actual_budget_pct,
    -- Variance Actual vs Forecast
    (a.value - COALESCE(f.value, b.value)) AS variance_actual_forecast,
    CASE WHEN COALESCE(f.value, b.value) != 0 THEN ((a.value - COALESCE(f.value, b.value)) / COALESCE(f.value, b.value)) * 100 ELSE 0 END AS variance_actual_forecast_pct,
    -- Status baseado na variância e polaridade
    CASE
        WHEN k.polarity = 'HIGHER_IS_BETTER' THEN
            CASE
                WHEN a.value >= b.value THEN 'FAVORABLE'
                WHEN a.value >= b.value * 0.95 THEN 'ACCEPTABLE'
                ELSE 'UNFAVORABLE'
            END
        ELSE -- LOWER_IS_BETTER
            CASE
                WHEN a.value <= b.value THEN 'FAVORABLE'
                WHEN a.value <= b.value * 1.05 THEN 'ACCEPTABLE'
                ELSE 'UNFAVORABLE'
            END
    END AS variance_status
FROM strategic_kpi_value_version a
INNER JOIN strategic_kpi k ON a.kpi_id = k.id
LEFT JOIN strategic_kpi_value_version b
    ON a.kpi_id = b.kpi_id
    AND a.period_year = b.period_year
    AND a.period_month = b.period_month
    AND b.version_type = 'BUDGET'
    AND b.deleted_at IS NULL
LEFT JOIN strategic_kpi_value_version f
    ON a.kpi_id = f.kpi_id
    AND a.period_year = f.period_year
    AND a.period_month = f.period_month
    AND f.version_type = 'FORECAST'
    AND f.deleted_at IS NULL
WHERE a.version_type = 'ACTUAL'
    AND a.deleted_at IS NULL
    AND k.deleted_at IS NULL;
