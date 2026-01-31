-- Migration: 0046_create_strategic_views.sql
-- Task 01: SQL Views para otimizar queries de dashboard e relatórios enterprise
-- Move cálculos pesados do JavaScript para o banco de dados

-- View 1: Resumo de Goals por Perspectiva
CREATE VIEW vw_strategic_goals_summary AS
SELECT
    sg.organization_id,
    sg.branch_id,
    bp.id AS perspective_id,
    bp.name AS perspective_name,
    COUNT(sg.id) AS total_goals,
    SUM(CASE WHEN sg.status = 'ON_TRACK' THEN 1 ELSE 0 END) AS on_track_count,
    SUM(CASE WHEN sg.status = 'AT_RISK' THEN 1 ELSE 0 END) AS at_risk_count,
    SUM(CASE WHEN sg.status = 'CRITICAL' THEN 1 ELSE 0 END) AS critical_count,
    SUM(CASE WHEN sg.status = 'ACHIEVED' THEN 1 ELSE 0 END) AS achieved_count,
    AVG(CAST(sg.current_value AS FLOAT) / NULLIF(CAST(sg.target_value AS FLOAT), 0) * 100) AS avg_completion_pct,
    AVG(sg.weight) AS avg_weight
FROM strategic_goal sg
INNER JOIN strategic_bsc_perspective bp ON sg.perspective_id = bp.id
WHERE sg.deleted_at IS NULL
GROUP BY sg.organization_id, sg.branch_id, bp.id, bp.name;
GO

-- View 2: Performance de KPIs com status calculado
CREATE VIEW vw_kpi_performance AS
SELECT
    k.organization_id,
    k.branch_id,
    k.id AS kpi_id,
    k.code,
    k.name,
    k.goal_id,
    k.current_value,
    k.target_value,
    k.alert_threshold,
    k.critical_threshold,
    k.polarity,
    CASE
        WHEN k.polarity IN ('HIGHER_IS_BETTER', 'UP') THEN
            CASE
                WHEN k.current_value >= k.target_value THEN 'ON_TRACK'
                WHEN k.current_value >= COALESCE(k.alert_threshold, k.target_value * 0.8) THEN 'AT_RISK'
                ELSE 'CRITICAL'
            END
        ELSE -- LOWER_IS_BETTER or DOWN
            CASE
                WHEN k.current_value <= k.target_value THEN 'ON_TRACK'
                WHEN k.current_value <= COALESCE(k.alert_threshold, k.target_value * 1.2) THEN 'AT_RISK'
                ELSE 'CRITICAL'
            END
    END AS calculated_status,
    CAST(k.current_value AS FLOAT) / NULLIF(CAST(k.target_value AS FLOAT), 0) * 100 AS achievement_pct,
    k.updated_at AS last_updated
FROM strategic_kpi k
WHERE k.deleted_at IS NULL;
GO

-- View 3: Action Plans para Kanban com métricas
CREATE VIEW vw_action_plans_kanban AS
SELECT
    ap.organization_id,
    ap.branch_id,
    ap.status,
    COUNT(ap.id) AS total_plans,
    SUM(CASE WHEN ap.when_end < GETDATE() AND ap.status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 ELSE 0 END) AS overdue_count,
    AVG(ap.completion_percent) AS avg_completion,
    COUNT(DISTINCT ap.who_user_id) AS unique_responsibles
FROM strategic_action_plan ap
WHERE ap.deleted_at IS NULL
GROUP BY ap.organization_id, ap.branch_id, ap.status;
GO

-- View 4: Control Items com status de verificação
CREATE VIEW vw_control_items_status AS
SELECT
    ci.organization_id,
    ci.branch_id,
    ci.id AS control_item_id,
    ci.code,
    ci.name,
    ci.process_area,
    ci.current_value,
    ci.target_value,
    ci.upper_limit,
    ci.lower_limit,
    CASE
        WHEN ci.current_value BETWEEN ci.lower_limit AND ci.upper_limit THEN 'NORMAL'
        WHEN ci.current_value < ci.lower_limit OR ci.current_value > ci.upper_limit THEN 'OUT_OF_RANGE'
        ELSE 'UNKNOWN'
    END AS limit_status,
    CASE
        WHEN ci.current_value = ci.target_value THEN 'ON_TARGET'
        WHEN ABS(ci.current_value - ci.target_value) / NULLIF(ci.target_value, 0) <= 0.05 THEN 'NEAR_TARGET'
        ELSE 'OFF_TARGET'
    END AS target_status,
    (SELECT COUNT(*) FROM strategic_verification_item vi WHERE vi.control_item_id = ci.id AND vi.deleted_at IS NULL) AS verification_items_count
FROM strategic_control_item ci
WHERE ci.deleted_at IS NULL;
GO
