-- ============================================================================
-- AURA CORE - SEED DE DADOS ENTERPRISE
-- Popula todas as tabelas com dados realistas para demonstração
-- ============================================================================

-- 1. MATRIZ TRIBUTÁRIA (Rotas principais SP)
INSERT INTO fiscal_tax_matrix (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, cst_description, icms_rate, fcp_rate, difal_applicable, difal_origin_percentage, difal_destination_percentage, legal_basis, is_active) VALUES
(1, 'SP', 'RJ', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 0, 0.00, 0.00, 'Res.SF 13/2012', 1),
(1, 'SP', 'MG', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 0, 0.00, 0.00, 'Lei MG 6763/75', 1),
(1, 'SP', 'BA', 'GERAL', 1, '00', 'Tributação Normal', 7.00, 2.00, 0, 0.00, 0.00, 'Lei BA 7014/96', 1),
(1, 'SP', 'PR', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 0, 0.00, 0.00, 'Lei PR 11580/96', 1),
(1, 'SP', 'RS', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 0, 0.00, 0.00, 'Lei RS 8820/89', 1),
(1, 'SP', 'SC', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 0, 0.00, 0.00, 'Lei SC 10297/96', 1),
(1, 'SP', 'GO', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 0, 0.00, 0.00, 'Lei GO 11651/91', 1),
(1, 'SP', 'MT', 'GRÃOS', 1, '40', 'Isenta/Não Tributada', 0.00, 0.00, 0, 0.00, 0.00, 'Conv.ICMS 100/97', 1),
(1, 'SP', 'MS', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 0, 0.00, 0.00, 'Lei MS 1810/97', 1),
(1, 'SP', 'ES', 'GERAL', 1, '00', 'Tributação Normal', 12.00, 0.00, 0, 0.00, 0.00, 'Lei ES 7000/01', 1),
(1, 'SP', 'PE', 'GERAL', 1, '00', 'Tributação Normal', 7.00, 2.00, 0, 0.00, 0.00, 'Lei PE 15730/16', 1),
(1, 'SP', 'CE', 'GERAL', 1, '00', 'Tributação Normal', 7.00, 2.00, 0, 0.00, 0.00, 'Lei CE 12670/96', 1),
-- DIFAL (não contribuinte)
(1, 'SP', 'RJ', 'GERAL', 0, '00', 'Com DIFAL', 12.00, 0.00, 1, 12.00, 12.00, 'EC 87/2015', 1),
(1, 'SP', 'MG', 'GERAL', 0, '00', 'Com DIFAL', 12.00, 0.00, 1, 12.00, 12.00, 'EC 87/2015', 1),
(1, 'SP', 'BA', 'GERAL', 0, '00', 'Com DIFAL', 12.00, 2.00, 1, 12.00, 7.00, 'EC 87/2015', 1);

-- 2. WMS BILLING EVENTS (Eventos do mês)
INSERT INTO wms_billing_events (organization_id, customer_id, event_type, event_date, quantity, unit_of_measure, unit_price, subtotal, billing_period, billing_status, notes) VALUES
(1, 1, 'STORAGE', DATEADD(day, -25, GETDATE()), 150, 'Pallets', 100.00, 15000.00, NULL, 'PENDING', 'Armazenagem padrão'),
(1, 1, 'INBOUND', DATEADD(day, -24, GETDATE()), 80, 'Caixas', 50.00, 4000.00, NULL, 'PENDING', 'Recebimento container'),
(1, 1, 'OUTBOUND', DATEADD(day, -22, GETDATE()), 120, 'Itens', 30.00, 3600.00, NULL, 'PENDING', 'Separação pedidos'),
(1, 1, 'LABELING', DATEADD(day, -20, GETDATE()), 500, 'Etiquetas', 2.00, 1000.00, NULL, 'PENDING', 'Etiquetagem produtos'),
(1, 2, 'STORAGE', DATEADD(day, -25, GETDATE()), 200, 'Pallets', 100.00, 20000.00, NULL, 'PENDING', 'Armazenagem Premium'),
(1, 2, 'CROSS_DOCK', DATEADD(day, -23, GETDATE()), 50, 'Pallets', 80.00, 4000.00, NULL, 'PENDING', 'Cross-docking expresso'),
(1, 3, 'STORAGE', DATEADD(day, -25, GETDATE()), 100, 'Pallets', 100.00, 10000.00, NULL, 'PENDING', 'Armazenagem padrão'),
(1, 3, 'EXTRAS', DATEADD(day, -21, GETDATE()), 10, 'Horas', 150.00, 1500.00, NULL, 'PENDING', 'Mão de obra extra');

-- 3. DRIVER WORK JOURNEY (Jornadas com violações)
INSERT INTO driver_work_journey (organization_id, driver_id, vehicle_id, journey_date, started_at, finished_at, total_driving_hours, total_rest_hours, total_waiting_hours, exceeded_max_driving, insufficient_rest, regular_hours, overtime_50, overtime_100, night_hours, waiting_hours, base_salary_day, overtime_amount, night_amount, waiting_amount, processed) VALUES
(1, 1, 1, DATEADD(day, -5, GETDATE()), DATEADD(day, -5, GETDATE()), DATEADD(day, -5, GETDATE()), 6.2, 10.0, 2.0, 1, 1, 8.0, 2.0, 0.2, 1.5, 2.0, 109.09, 38.18, 8.18, 16.36, 1),
(1, 2, 2, DATEADD(day, -5, GETDATE()), DATEADD(day, -5, GETDATE()), DATEADD(day, -5, GETDATE()), 5.0, 11.5, 1.5, 0, 0, 6.5, 0.0, 0.0, 0.5, 1.5, 88.64, 0.00, 2.27, 10.23, 1),
(1, 3, 3, DATEADD(day, -4, GETDATE()), DATEADD(day, -4, GETDATE()), DATEADD(day, -4, GETDATE()), 5.8, 10.2, 2.5, 1, 1, 8.0, 2.0, 0.3, 1.8, 2.5, 109.09, 41.59, 9.82, 18.41, 1),
(1, 1, 1, DATEADD(day, -3, GETDATE()), DATEADD(day, -3, GETDATE()), DATEADD(day, -3, GETDATE()), 5.2, 11.8, 1.0, 0, 0, 6.2, 0.0, 0.0, 0.8, 1.0, 84.55, 0.00, 3.64, 6.82, 1),
(1, 4, 4, DATEADD(day, -3, GETDATE()), DATEADD(day, -3, GETDATE()), DATEADD(day, -3, GETDATE()), 4.5, 12.5, 1.0, 0, 0, 5.5, 0.0, 0.0, 0.3, 1.0, 75.00, 0.00, 1.36, 6.82, 1);

-- 4. CLAIMS (Sinistros)
INSERT INTO claims_management (organization_id, claim_number, claim_date, claim_type, vehicle_id, estimated_damage, insurance_coverage, franchise_amount, claim_status, notes) VALUES
(1, 'SIN-001', DATEADD(day, -20, GETDATE()), 'ACCIDENT', 1, 150000.00, 800000.00, 5000.00, 'INSURANCE_CLAIMED', 'Colisão traseira - Rodovia Anhanguera'),
(1, 'SIN-002', DATEADD(day, -15, GETDATE()), 'THEFT', 2, 380000.00, 800000.00, 5000.00, 'INSURANCE_PAID', 'Roubo de carga - Dutra KM 180'),
(1, 'SIN-003', DATEADD(day, -10, GETDATE()), 'DAMAGE', 3, 25000.00, 800000.00, 5000.00, 'FRANCHISE_PAID', 'Dano na carroceria - manobra CD'),
(1, 'SIN-004', DATEADD(day, -5, GETDATE()), 'ACCIDENT', 4, 85000.00, 800000.00, 5000.00, 'UNDER_REVIEW', 'Acidente múltiplo - aguardando perícia'),
(1, 'SIN-005', DATEADD(day, -2, GETDATE()), 'DAMAGE', 5, 12000.00, 800000.00, 5000.00, 'OPENED', 'Quebra de para-brisa');

-- 5. CIAP CONTROL (Veículos no CIAP)
INSERT INTO ciap_control (organization_id, asset_id, purchase_date, purchase_amount, icms_rate, icms_total_credit, total_installments, monthly_installment, installments_appropriated, appropriation_start_date, total_appropriated, balance_to_appropriate, status) VALUES
(1, 1, '2023-01-15', 850000.00, 12.00, 102000.00, 48, 2125.00, 20, '2023-01-15', 42500.00, 59500.00, 'ACTIVE'),
(1, 2, '2023-06-10', 920000.00, 12.00, 110400.00, 48, 2300.00, 14, '2023-06-10', 32200.00, 78200.00, 'ACTIVE'),
(1, 3, '2023-11-05', 780000.00, 12.00, 93600.00, 48, 1950.00, 8, '2023-11-05', 15600.00, 78000.00, 'ACTIVE'),
(1, 4, '2024-03-20', 960000.00, 12.00, 115200.00, 48, 2400.00, 5, '2024-03-20', 12000.00, 103200.00, 'ACTIVE'),
(1, 5, '2024-08-12', 890000.00, 12.00, 106800.00, 48, 2225.00, 1, '2024-08-12', 2225.00, 104575.00, 'ACTIVE');

-- 6. CARBON EMISSIONS (Emissões CO2)
INSERT INTO carbon_emissions (organization_id, document_type, document_id, customer_id, customer_name, vehicle_id, fuel_consumed_liters, distance_km, fuel_efficiency, emission_factor, co2_emission_kg, co2_emission_tons, emission_date, offset_status) VALUES
(1, 'CTE', 1001, 1, 'Cliente A Logística S.A.', 1, 150.0, 375.0, 2.50, 2.60, 390.0, 0.390, DATEADD(day, -10, GETDATE()), 'NONE'),
(1, 'CTE', 1002, 1, 'Cliente A Logística S.A.', 2, 180.0, 450.0, 2.50, 2.60, 468.0, 0.468, DATEADD(day, -9, GETDATE()), 'NONE'),
(1, 'CTE', 1003, 2, 'Cliente B Transportes Ltda', 3, 200.0, 520.0, 2.60, 2.60, 520.0, 0.520, DATEADD(day, -8, GETDATE()), 'NONE'),
(1, 'CTE', 1004, 2, 'Cliente B Transportes Ltda', 1, 165.0, 412.5, 2.50, 2.60, 429.0, 0.429, DATEADD(day, -7, GETDATE()), 'COMPENSATED'),
(1, 'CTE', 1005, 3, 'Cliente C Indústria e Comércio', 4, 140.0, 350.0, 2.50, 2.60, 364.0, 0.364, DATEADD(day, -6, GETDATE()), 'NONE'),
(1, 'CTE', 1006, 3, 'Cliente C Indústria e Comércio', 5, 155.0, 387.5, 2.50, 2.60, 403.0, 0.403, DATEADD(day, -5, GETDATE()), 'NONE'),
(1, 'CTE', 1007, 1, 'Cliente A Logística S.A.', 2, 170.0, 425.0, 2.50, 2.60, 442.0, 0.442, DATEADD(day, -4, GETDATE()), 'NONE'),
(1, 'CTE', 1008, 2, 'Cliente B Transportes Ltda', 3, 190.0, 475.0, 2.50, 2.60, 494.0, 0.494, DATEADD(day, -3, GETDATE()), 'NONE');

-- 7. INTERCOMPANY ALLOCATIONS (Histórico de rateios)
INSERT INTO intercompany_allocations (organization_id, allocation_period, allocation_date, source_branch_id, source_account_id, total_amount, allocation_method, status) VALUES
(1, '11/2024', '2024-11-30', 1, 1, 45000.00, 'PERCENTAGE', 'POSTED'),
(1, '11/2024', '2024-11-30', 1, 1, 28500.00, 'REVENUE', 'POSTED'),
(1, '10/2024', '2024-10-31', 1, 1, 42800.00, 'PERCENTAGE', 'POSTED'),
(1, '10/2024', '2024-10-31', 1, 1, 26000.00, 'REVENUE', 'POSTED'),
(1, '09/2024', '2024-09-30', 1, 1, 41200.00, 'PERCENTAGE', 'POSTED');

-- 8. COST CENTER APPROVERS (Aprovadores por CC)
INSERT INTO cost_center_approvers (organization_id, cost_center_id, approver_role, approver_name, approval_limit, notes) VALUES
(1, 1, 'GERENTE', 'João Silva', 50000.00, 'Aprovador padrão centro de custo 1'),
(1, 2, 'DIRETOR', 'Maria Santos', 30000.00, 'Aprovador padrão centro de custo 2'),
(1, 3, 'SUPERVISOR', 'Pedro Oliveira', 10000.00, 'Aprovador padrão centro de custo 3'),
(1, 4, 'GERENTE', 'João Silva', 100000.00, 'Aprovador padrão centro de custo 4'),
(1, 5, 'DIRETOR', 'Maria Santos', 25000.00, 'Aprovador padrão centro de custo 5');

-- 9. DRIVER PERFORMANCE CONFIG (Configurações de bonificação)
INSERT INTO driver_performance_config (organization_id, config_name, km_bonus_enabled, km_bonus_per_unit, km_minimum_threshold, fuel_bonus_enabled, fuel_target_average, fuel_bonus_percentage, dangerous_cargo_bonus, dangerous_cargo_percentage, unhealthy_bonus, unhealthy_percentage, is_active) VALUES
(1, 'Política Padrão Motoristas', 1, 0.15, 5000, 1, 2.80, 5.00, 1, 30.00, 1, 20.00, 1),
(1, 'Política Premium (Longa Distância)', 1, 0.20, 8000, 1, 3.00, 8.00, 1, 35.00, 1, 25.00, 1),
(1, 'Política Urbana', 0, 0.00, 0, 1, 2.50, 3.00, 0, 0.00, 0, 0.00, 1);

-- 10. COST ALLOCATION RULES (Regras de rateio de custos)
INSERT INTO cost_allocation_rules (organization_id, rule_name, source_account_id, source_cost_center_id, allocation_method, allocation_frequency, is_active, notes) VALUES
(1, 'Energia Elétrica - Matriz', 1, 1, 'PERCENTAGE', 'MONTHLY', 1, 'Rateio fixo conforme área ocupada'),
(1, 'AWS Cloud', 2, 1, 'REVENUE', 'MONTHLY', 1, 'Proporcional ao faturamento'),
(1, 'Marketing Corporativo', 3, 1, 'EQUAL', 'MONTHLY', 1, 'Divisão igual entre filiais');

-- Sucesso!
SELECT 'SEED DE DADOS ENTERPRISE EXECUTADO COM SUCESSO!' as message;
SELECT 'Matriz Tributária: 15 rotas' as info1;
SELECT 'WMS: 8 eventos billables' as info2;
SELECT 'RH: 5 jornadas com alertas' as info3;
SELECT 'Sinistros: 5 casos' as info4;
SELECT 'CIAP: 5 ativos' as info5;
SELECT 'ESG: 8 emissões CO2' as info6;
SELECT 'Intercompany: 5 rateios' as info7;

