-- ============================================================================
-- MIGRATION 0028: CIAP + SINISTROS + INTERCOMPANY + ESG
-- ============================================================================
-- Parte 3 da estrutura Enterprise
-- ============================================================================

-- ============================================================================
-- PARTE 7: CIAP (Controle Crédito ICMS Ativo Permanente)
-- ============================================================================

-- 7.1 CONTAS DE CRÉDITO CIAP
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '1.1.4.05', 'ICMS sobre Ativo Permanente (CIAP)', 'Crédito em 48 meses - Lei Kandir', 'ASSET', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.4.05' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '1.1.4.05.001', 'ICMS s/ Ativo Permanente a Recuperar (LP)', 'Longo prazo (> 12 meses)', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.4.05' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '1.1.4.05.002', 'ICMS s/ Ativo Permanente a Recuperar (CP)', 'Curto prazo (12 meses)', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.4.05' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '1.1.4.05.003', 'Crédito de CIAP do Mês (Apropriado)', 'Parcela 1/48 compensada', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.4.05' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

-- 7.2 TABELA DE CONTROLE CIAP
CREATE TABLE IF NOT EXISTS ciap_control (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id),
    
    -- Ativo
    asset_id INT NOT NULL REFERENCES vehicles(id),
    asset_description VARCHAR(255),
    purchase_date DATE NOT NULL,
    purchase_amount DECIMAL(15,2) NOT NULL,
    
    -- ICMS da Aquisição
    icms_rate DECIMAL(5,2) NOT NULL,
    icms_total_credit DECIMAL(15,2) NOT NULL,
    
    -- Parcelamento (48 meses)
    total_installments INT DEFAULT 48,
    monthly_installment DECIMAL(15,2) NOT NULL,
    
    -- Apropriação
    appropriation_start_date DATE NOT NULL,
    installments_appropriated INT DEFAULT 0,
    total_appropriated DECIMAL(15,2) DEFAULT 0,
    balance_to_appropriate DECIMAL(15,2),
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE',
    completed_at DATE,
    cancellation_reason TEXT,
    
    -- SPED
    last_sped_g_generation DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ciap_asset ON ciap_control(asset_id);
CREATE INDEX idx_ciap_status ON ciap_control(status);

-- 7.3 TABELA DE APROPRIAÇÃO MENSAL CIAP
CREATE TABLE IF NOT EXISTS ciap_monthly_appropriation (
    id SERIAL PRIMARY KEY,
    ciap_control_id INT NOT NULL REFERENCES ciap_control(id),
    
    -- Período
    reference_month DATE NOT NULL,
    
    -- Fator de Apropriação
    total_revenue DECIMAL(15,2) NOT NULL,
    taxable_revenue DECIMAL(15,2) NOT NULL,
    exempt_revenue DECIMAL(15,2) DEFAULT 0,
    appropriation_factor DECIMAL(5,4) NOT NULL,
    
    -- Valores
    installment_base DECIMAL(15,2) NOT NULL,
    appropriated_amount DECIMAL(15,2) NOT NULL,
    
    -- Lançamento Contábil
    journal_entry_id INT,
    accounting_posted BOOLEAN DEFAULT FALSE,
    
    -- SPED Bloco G
    sped_generated BOOLEAN DEFAULT FALSE,
    sped_line TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ciap_monthly ON ciap_monthly_appropriation(reference_month);

-- ============================================================================
-- PARTE 8: GESTÃO DE SINISTROS (Seguros)
-- ============================================================================

-- 8.1 CONTAS DE SINISTROS
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '1.1.2.06', 'Créditos de Sinistros', 'A receber de seguros', 'ASSET', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.2.06' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '1.1.2.06.001', 'Créditos com Seguradoras (A Receber)', 'Indenização aprovada', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.2.06' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '1.1.2.06.002', 'Créditos com Terceiros (Culpados)', 'Valor a cobrar causador', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.2.06' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '4.4.2', 'PERDAS COM SINISTROS', 'Baixas e franquias', 'EXPENSE', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.4.2' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.4.2.01', 'Franquias e Perdas', 'Custos não cobertos', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.4.2' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.4.2.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.4.2.01.001', 'Baixa de Ativo por Sinistro (Perda Total)', 'Zera valor do ativo', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.4.2.01' AND organization_id = 1), TRUE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.4.2.01.001' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '3.3', 'RECEITAS NÃO OPERACIONAIS', 'Receitas eventuais', 'REVENUE', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.3' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '3.3.1', 'Receitas Eventuais', 'Indenizações e ganhos', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.3' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.3.1' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '3.3.1.01', 'Indenizações', 'Recebimentos de seguros', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.3.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.3.1.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '3.3.1.01.001', 'Receita de Indenização de Seguros', 'Entrada seguradora', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.3.1.01' AND organization_id = 1), TRUE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.3.1.01.001' AND organization_id = 1);

-- 8.2 TABELA DE SINISTROS
CREATE TABLE IF NOT EXISTS claims_management (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id),
    
    -- Sinistro
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    claim_date DATE NOT NULL,
    claim_type VARCHAR(50) NOT NULL,
    
    -- Bem Sinistrado
    asset_type VARCHAR(50),
    vehicle_id INT REFERENCES vehicles(id),
    asset_description TEXT,
    
    -- Valores
    estimated_damage DECIMAL(15,2),
    franchise_amount DECIMAL(15,2),
    insurance_coverage DECIMAL(15,2),
    deductible_amount DECIMAL(15,2),
    
    -- Seguradora
    insurance_company VARCHAR(255),
    policy_number VARCHAR(100),
    claim_status VARCHAR(30) DEFAULT 'OPENED',
    
    -- Terceiros
    third_party_fault BOOLEAN DEFAULT FALSE,
    third_party_name VARCHAR(255),
    third_party_insurance VARCHAR(255),
    recoverable_from_third DECIMAL(15,2),
    
    -- Lançamentos Contábeis
    franchise_posted BOOLEAN DEFAULT FALSE,
    franchise_journal_entry_id INT,
    receivable_posted BOOLEAN DEFAULT FALSE,
    receivable_journal_entry_id INT,
    income_posted BOOLEAN DEFAULT FALSE,
    income_journal_entry_id INT,
    
    -- Documentos
    police_report_number VARCHAR(100),
    photos_url TEXT[],
    repair_quotes TEXT[],
    
    -- Rastreabilidade
    reported_by INT,
    handled_by INT,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claims_status ON claims_management(claim_status);
CREATE INDEX idx_claims_date ON claims_management(claim_date);
CREATE INDEX idx_claims_vehicle ON claims_management(vehicle_id);

-- ============================================================================
-- PARTE 9: INTERCOMPANY (Matriz e Filiais)
-- ============================================================================

-- 9.1 CONTAS DE MÚTUO E ELIMINAÇÃO
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '1.1.9', 'TRANSAÇÕES VINCULADAS (Intercompany)', 'Matriz e filiais', 'ASSET', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.9' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '1.1.9.01', 'Conta Corrente Intercompany', 'Débitos e créditos internos', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.9' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.9.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '1.1.9.01.001', 'Conta Corrente Matriz (Ativo)', 'O que Filial deve à Matriz', 'ASSET', (SELECT id FROM financial_chart_accounts WHERE code = '1.1.9.01' AND organization_id = 1), TRUE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '1.1.9.01.001' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '2.1.9', 'TRANSAÇÕES VINCULADAS (Intercompany)', 'Matriz e filiais', 'LIABILITY', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '2.1.9' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '2.1.9.01', 'Conta Corrente Intercompany', 'Débitos e créditos internos', 'LIABILITY', (SELECT id FROM financial_chart_accounts WHERE code = '2.1.9' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '2.1.9.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '2.1.9.01.001', 'Conta Corrente Filiais (Passivo)', 'O que Matriz deve às Filiais', 'LIABILITY', (SELECT id FROM financial_chart_accounts WHERE code = '2.1.9.01' AND organization_id = 1), TRUE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '2.1.9.01.001' AND organization_id = 1);

-- 9.2 TABELA DE RATEIO CORPORATIVO
CREATE TABLE IF NOT EXISTS intercompany_allocations (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id),
    
    -- Período
    allocation_period VARCHAR(7) NOT NULL,
    allocation_date DATE NOT NULL,
    
    -- Empresa Origem (quem pagou)
    source_branch_id INT NOT NULL REFERENCES organizations(id),
    source_account_id INT NOT NULL REFERENCES financial_chart_accounts(id),
    total_amount DECIMAL(15,2) NOT NULL,
    
    -- Método de Rateio
    allocation_method VARCHAR(50) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'DRAFT',
    approved_by INT,
    approved_at TIMESTAMP,
    
    -- Lançamento
    posted BOOLEAN DEFAULT FALSE,
    posted_at TIMESTAMP,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_intercompany_period ON intercompany_allocations(allocation_period);
CREATE INDEX idx_intercompany_status ON intercompany_allocations(status);

-- 9.3 TABELA DE DETALHES DO RATEIO
CREATE TABLE IF NOT EXISTS intercompany_allocation_details (
    id SERIAL PRIMARY KEY,
    allocation_id INT NOT NULL REFERENCES intercompany_allocations(id),
    
    -- Empresa Destino (quem recebe o custo)
    target_branch_id INT NOT NULL REFERENCES organizations(id),
    target_account_id INT NOT NULL REFERENCES financial_chart_accounts(id),
    
    -- Valores
    allocation_percentage DECIMAL(5,2),
    allocated_amount DECIMAL(15,2) NOT NULL,
    
    -- Lançamento Contábil
    journal_entry_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PARTE 10: ESG - SUSTENTABILIDADE E CARBONO
-- ============================================================================

-- 10.1 TABELA DE EMISSÕES DE CARBONO
CREATE TABLE IF NOT EXISTS carbon_emissions (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id),
    
    -- Documento/Viagem
    document_type VARCHAR(20) NOT NULL,
    document_id INT,
    document_number VARCHAR(50),
    
    -- Veículo e Rota
    vehicle_id INT REFERENCES vehicles(id),
    fuel_type VARCHAR(20) DEFAULT 'DIESEL',
    
    -- Consumo
    fuel_consumed_liters DECIMAL(10,2),
    distance_km DECIMAL(10,2),
    fuel_efficiency DECIMAL(5,2),
    
    -- Fator de Emissão (kg CO2e por litro)
    emission_factor DECIMAL(5,3) DEFAULT 2.600,
    
    -- Emissão Calculada
    co2_emission_kg DECIMAL(10,3),
    co2_emission_tons DECIMAL(10,6),
    
    -- Cliente (para relatório ESG)
    customer_id INT REFERENCES partners(id),
    customer_name VARCHAR(255),
    
    -- Data
    emission_date DATE NOT NULL,
    
    -- Compensação
    offset_status VARCHAR(20) DEFAULT 'NONE',
    offset_certificate_url TEXT,
    offset_project_name VARCHAR(255),
    offset_date DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_carbon_date ON carbon_emissions(emission_date);
CREATE INDEX idx_carbon_customer ON carbon_emissions(customer_id, emission_date);
CREATE INDEX idx_carbon_document ON carbon_emissions(document_type, document_id);

-- ============================================================================
-- VIEWS DE APOIO
-- ============================================================================

-- View: Resumo de Jornadas com Alertas
CREATE OR REPLACE VIEW v_driver_journey_alerts AS
SELECT 
    dj.id,
    dj.driver_id,
    d.name as driver_name,
    dj.journey_date,
    dj.total_driving_hours,
    dj.total_waiting_hours,
    dj.exceeded_max_driving,
    dj.insufficient_rest,
    dj.waiting_amount,
    dj.overtime_amount,
    CASE 
        WHEN dj.exceeded_max_driving THEN '⚠️ EXCESSO DE JORNADA'
        WHEN dj.insufficient_rest THEN '⚠️ DESCANSO INSUFICIENTE'
        ELSE '✅ OK'
    END as alert_status
FROM driver_work_journey dj
JOIN drivers d ON dj.driver_id = d.id
WHERE dj.journey_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY dj.journey_date DESC;

-- View: Matriz Fiscal Ativa
CREATE OR REPLACE VIEW v_active_tax_matrix AS
SELECT 
    ftm.*,
    CONCAT(ftm.uf_origin, ' → ', ftm.uf_destination) as route,
    CONCAT(ftm.icms_rate, '%') as icms_display,
    CONCAT(ftm.fcp_rate, '%') as fcp_display,
    CASE 
        WHEN ftm.difal_applicable THEN 'SIM' 
        ELSE 'NÃO' 
    END as difal_display
FROM fiscal_tax_matrix ftm
WHERE ftm.is_active = TRUE
  AND (ftm.valid_until IS NULL OR ftm.valid_until >= CURRENT_DATE)
ORDER BY ftm.uf_origin, ftm.uf_destination, ftm.cargo_type;

-- View: WMS Billing Summary por Cliente
CREATE OR REPLACE VIEW v_wms_billing_summary AS
SELECT 
    wbe.customer_id,
    p.name as customer_name,
    wbe.billing_period,
    wbe.event_type,
    COUNT(*) as event_count,
    SUM(wbe.quantity) as total_quantity,
    wbe.unit_of_measure,
    SUM(wbe.subtotal) as total_amount,
    wbe.billing_status
FROM wms_billing_events wbe
JOIN partners p ON wbe.customer_id = p.id
WHERE wbe.billing_status != 'CANCELLED'
GROUP BY wbe.customer_id, p.name, wbe.billing_period, wbe.event_type, wbe.unit_of_measure, wbe.billing_status
ORDER BY wbe.billing_period DESC, total_amount DESC;

-- View: CIAP Pendente de Apropriação
CREATE OR REPLACE VIEW v_ciap_pending AS
SELECT 
    cc.id,
    cc.asset_description,
    cc.purchase_date,
    cc.icms_total_credit,
    cc.monthly_installment,
    cc.installments_appropriated,
    cc.total_installments,
    (cc.total_installments - cc.installments_appropriated) as installments_remaining,
    cc.balance_to_appropriate,
    cc.appropriation_start_date
FROM ciap_control cc
WHERE cc.status = 'ACTIVE'
  AND cc.installments_appropriated < cc.total_installments
ORDER BY cc.appropriation_start_date;

-- View: Sinistros Abertos
CREATE OR REPLACE VIEW v_claims_open AS
SELECT 
    cm.*,
    v.license_plate,
    v.model,
    (cm.estimated_damage - COALESCE(cm.insurance_coverage, 0)) as company_loss
FROM claims_management cm
LEFT JOIN vehicles v ON cm.vehicle_id = v.id
WHERE cm.claim_status NOT IN ('PAID', 'CLOSED')
ORDER BY cm.claim_date DESC;

-- View: ESG Carbon Summary
CREATE OR REPLACE VIEW v_esg_carbon_summary AS
SELECT 
    DATE_TRUNC('month', emission_date) as month,
    customer_id,
    customer_name,
    COUNT(*) as total_operations,
    SUM(fuel_consumed_liters) as total_fuel_liters,
    SUM(distance_km) as total_distance_km,
    AVG(fuel_efficiency) as avg_efficiency_kml,
    SUM(co2_emission_kg) as total_co2_kg,
    SUM(co2_emission_tons) as total_co2_tons,
    SUM(CASE WHEN offset_status = 'OFFSET' THEN co2_emission_tons ELSE 0 END) as offset_co2_tons
FROM carbon_emissions
GROUP BY DATE_TRUNC('month', emission_date), customer_id, customer_name
ORDER BY month DESC, total_co2_tons DESC;

-- View: Intercompany Pending
CREATE OR REPLACE VIEW v_intercompany_pending AS
SELECT 
    ia.*,
    fca.code as source_account_code,
    fca.name as source_account_name,
    o.name as source_branch_name
FROM intercompany_allocations ia
JOIN financial_chart_accounts fca ON ia.source_account_id = fca.id
JOIN organizations o ON ia.source_branch_id = o.id
WHERE ia.status = 'DRAFT' OR ia.status = 'APPROVED'
ORDER BY ia.allocation_date DESC;

-- ============================================================================
-- MIGRATION COMPLETA!
-- ============================================================================



















