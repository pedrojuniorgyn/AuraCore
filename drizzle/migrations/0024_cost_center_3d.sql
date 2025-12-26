-- ==========================================
-- MIGRATION 0024: CENTRO DE CUSTO 3D
-- ==========================================
-- Adiciona dimensões para CC Tridimensional:
-- D1: Filial (branch_id - já existe)
-- D2: Tipo de Serviço (service_type - NEW)
-- D3: Objeto de Custo (linked_object - NEW)
-- Data: 10/12/2024
-- ==========================================

-- ✅ D2: Tipo de Serviço
ALTER TABLE financial_cost_centers ADD service_type NVARCHAR(20);
-- Valores: 'FTL' (Lotação), 'LTL' (Fracionado), 'ARMAZ' (Armazenagem), 'DISTR' (Distribuição), 'ADM' (Administrativo)

-- ✅ D3: Objeto de Custo (Polimórfico)
ALTER TABLE financial_cost_centers ADD linked_object_type NVARCHAR(30);
-- Valores: 'CTE', 'VIAGEM', 'CONTRATO', 'VEICULO', 'DEPARTAMENTO'

ALTER TABLE financial_cost_centers ADD linked_object_id BIGINT;
-- ID do objeto (cte_id, vehicle_id, etc.)

-- ✅ Campo Asset Type (para identificação rápida)
ALTER TABLE financial_cost_centers ADD asset_type NVARCHAR(20);
-- Valores: 'VEHICLE', 'WAREHOUSE', 'DEPARTMENT', 'PROJECT'

-- ✅ Índices de Performance
CREATE INDEX idx_cost_centers_service_type ON financial_cost_centers(service_type);
CREATE INDEX idx_cost_centers_object ON financial_cost_centers(linked_object_type, linked_object_id);
CREATE INDEX idx_cost_centers_asset ON financial_cost_centers(asset_type);

PRINT '✅ Centro de Custo 3D configurado com sucesso!';
GO


















