-- Migration: 0050_update_control_items_view.sql
-- Fase 5: Atualizar view para incluir contagem de anomalias

DROP VIEW IF EXISTS vw_control_items_status;
GO

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
    (SELECT COUNT(*) FROM strategic_verification_item vi WHERE vi.control_item_id = ci.id AND vi.deleted_at IS NULL) AS verification_items_count,
    (SELECT COUNT(*) FROM strategic_anomaly a WHERE a.source_entity_id = ci.id AND a.source = 'CONTROL_ITEM' AND a.status = 'OPEN' AND a.deleted_at IS NULL) AS open_anomalies_count
FROM strategic_control_item ci
WHERE ci.deleted_at IS NULL;
GO
