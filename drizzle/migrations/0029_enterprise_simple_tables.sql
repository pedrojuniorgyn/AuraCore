-- ============================================================================
-- MIGRATION 0029: CRIAÇÃO SIMPLIFICADA DAS TABELAS ENTERPRISE (SQL Server)
-- ============================================================================

-- BACKOFFICE: Aprovadores
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'cost_center_approvers') AND type = 'U')
BEGIN
CREATE TABLE cost_center_approvers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    cost_center_id INT NOT NULL,
    approver_role VARCHAR(100) NOT NULL,
    approver_name VARCHAR(255),
    approval_limit DECIMAL(15,2),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END;

-- BACKOFFICE: Regras de Rateio
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'cost_allocation_rules') AND type = 'U')
BEGIN
CREATE TABLE cost_allocation_rules (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    source_account_id INT NULL,
    source_cost_center_id INT NULL,
    allocation_method VARCHAR(50) NOT NULL,
    allocation_frequency VARCHAR(20) DEFAULT 'MONTHLY',
    is_active BIT DEFAULT 1,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END;

-- BACKOFFICE: Targets de Rateio
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'cost_allocation_targets') AND type = 'U')
BEGIN
CREATE TABLE cost_allocation_targets (
    id INT IDENTITY(1,1) PRIMARY KEY,
    allocation_rule_id INT NOT NULL,
    target_cost_center_id INT NOT NULL,
    allocation_percentage DECIMAL(5,2),
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
);
END;

-- RH: Jornadas de Motoristas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'driver_work_journey') AND type = 'U')
BEGIN
CREATE TABLE driver_work_journey (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    driver_id INT NOT NULL,
    vehicle_id INT NULL,
    journey_date DATE NOT NULL,
    started_at DATETIME,
    finished_at DATETIME,
    total_driving_hours DECIMAL(5,2) DEFAULT 0,
    total_rest_hours DECIMAL(5,2) DEFAULT 0,
    total_waiting_hours DECIMAL(5,2) DEFAULT 0,
    exceeded_max_driving BIT DEFAULT 0,
    insufficient_rest BIT DEFAULT 0,
    regular_hours DECIMAL(5,2) DEFAULT 0,
    overtime_50 DECIMAL(5,2) DEFAULT 0,
    overtime_100 DECIMAL(5,2) DEFAULT 0,
    night_hours DECIMAL(5,2) DEFAULT 0,
    waiting_hours DECIMAL(5,2) DEFAULT 0,
    base_salary_day DECIMAL(10,2),
    waiting_amount DECIMAL(10,2),
    overtime_amount DECIMAL(10,2),
    night_amount DECIMAL(10,2),
    tracking_macro_id VARCHAR(100),
    processed BIT DEFAULT 0,
    processed_at DATETIME,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END;

-- RH: Configuração de Prêmios
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'driver_performance_config') AND type = 'U')
BEGIN
CREATE TABLE driver_performance_config (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    config_name VARCHAR(255) NOT NULL,
    km_bonus_enabled BIT DEFAULT 0,
    km_bonus_per_unit DECIMAL(10,4),
    km_minimum_threshold INT,
    fuel_bonus_enabled BIT DEFAULT 0,
    fuel_target_average DECIMAL(5,2),
    fuel_bonus_percentage DECIMAL(5,2),
    dangerous_cargo_bonus BIT DEFAULT 0,
    dangerous_cargo_percentage DECIMAL(5,2) DEFAULT 30.00,
    unhealthy_bonus BIT DEFAULT 0,
    unhealthy_percentage DECIMAL(5,2) DEFAULT 20.00,
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END;

-- FISCAL: Matriz Tributária
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'fiscal_tax_matrix') AND type = 'U')
BEGIN
CREATE TABLE fiscal_tax_matrix (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    uf_origin VARCHAR(2) NOT NULL,
    uf_destination VARCHAR(2) NOT NULL,
    cargo_type VARCHAR(50) DEFAULT 'GERAL',
    is_icms_contributor BIT DEFAULT 1,
    cst_code VARCHAR(3) NOT NULL,
    cst_description VARCHAR(255),
    icms_rate DECIMAL(5,2) NOT NULL,
    fcp_rate DECIMAL(5,2) DEFAULT 0,
    difal_applicable BIT DEFAULT 0,
    difal_origin_percentage DECIMAL(5,2) DEFAULT 0,
    difal_destination_percentage DECIMAL(5,2) DEFAULT 0,
    tax_benefit_code VARCHAR(50),
    tax_benefit_description NVARCHAR(MAX),
    requires_st BIT DEFAULT 0,
    is_active BIT DEFAULT 1,
    valid_from DATE,
    valid_until DATE,
    legal_basis NVARCHAR(MAX),
    business_rule NVARCHAR(MAX),
    alert_message NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END;

-- FISCAL: Log de Validação
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'fiscal_validation_log') AND type = 'U')
BEGIN
CREATE TABLE fiscal_validation_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    document_type VARCHAR(20) NOT NULL,
    document_number VARCHAR(50),
    document_id INT,
    validation_type VARCHAR(50) NOT NULL,
    validation_status VARCHAR(20) NOT NULL,
    uf_origin VARCHAR(2),
    uf_destination VARCHAR(2),
    cargo_type VARCHAR(50),
    rule_found BIT DEFAULT 0,
    icms_rate_applied DECIMAL(5,2),
    fcp_rate_applied DECIMAL(5,2),
    cst_applied VARCHAR(3),
    warning_message NVARCHAR(MAX),
    error_message NVARCHAR(MAX),
    suggested_action NVARCHAR(MAX),
    user_id INT,
    user_override BIT DEFAULT 0,
    override_justification NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
);
END;

-- WMS: Eventos de Faturamento
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'wms_billing_events') AND type = 'U')
BEGIN
CREATE TABLE wms_billing_events (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT NOT NULL,
    contract_id INT,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    event_timestamp DATETIME DEFAULT GETDATE(),
    quantity DECIMAL(10,2) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10,4) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    revenue_account_id INT,
    related_document_type VARCHAR(50),
    related_document_id INT,
    related_document_number VARCHAR(100),
    billing_status VARCHAR(20) DEFAULT 'PENDING',
    billing_period VARCHAR(7),
    pre_invoice_id INT,
    invoice_id INT,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END;

-- WMS: Pré-Faturas
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'wms_pre_invoices') AND type = 'U')
BEGIN
CREATE TABLE wms_pre_invoices (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    customer_id INT NOT NULL,
    billing_period VARCHAR(7) NOT NULL,
    measurement_date DATE NOT NULL,
    total_storage DECIMAL(15,2) DEFAULT 0,
    total_inbound DECIMAL(15,2) DEFAULT 0,
    total_outbound DECIMAL(15,2) DEFAULT 0,
    total_extras DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL,
    iss_rate DECIMAL(5,2) DEFAULT 0,
    iss_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT',
    sent_to_customer_at DATETIME,
    customer_approved_at DATETIME,
    customer_rejected_at DATETIME,
    rejection_reason NVARCHAR(MAX),
    invoice_number VARCHAR(50),
    invoice_issued_at DATETIME,
    invoice_due_date DATE,
    pdf_url NVARCHAR(MAX),
    xml_url NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END;

-- CIAP: Controle
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'ciap_control') AND type = 'U')
BEGIN
CREATE TABLE ciap_control (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    asset_id INT NOT NULL,
    asset_description VARCHAR(255),
    purchase_date DATE NOT NULL,
    purchase_amount DECIMAL(15,2) NOT NULL,
    icms_rate DECIMAL(5,2) NOT NULL,
    icms_total_credit DECIMAL(15,2) NOT NULL,
    total_installments INT DEFAULT 48,
    monthly_installment DECIMAL(15,2) NOT NULL,
    appropriation_start_date DATE NOT NULL,
    installments_appropriated INT DEFAULT 0,
    total_appropriated DECIMAL(15,2) DEFAULT 0,
    balance_to_appropriate DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    completed_at DATE,
    cancellation_reason NVARCHAR(MAX),
    last_sped_g_generation DATE,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END;

-- CIAP: Apropriação Mensal
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'ciap_monthly_appropriation') AND type = 'U')
BEGIN
CREATE TABLE ciap_monthly_appropriation (
    id INT IDENTITY(1,1) PRIMARY KEY,
    ciap_control_id INT NOT NULL,
    reference_month DATE NOT NULL,
    total_revenue DECIMAL(15,2) NOT NULL,
    taxable_revenue DECIMAL(15,2) NOT NULL,
    exempt_revenue DECIMAL(15,2) DEFAULT 0,
    appropriation_factor DECIMAL(5,4) NOT NULL,
    installment_base DECIMAL(15,2) NOT NULL,
    appropriated_amount DECIMAL(15,2) NOT NULL,
    journal_entry_id INT,
    accounting_posted BIT DEFAULT 0,
    sped_generated BIT DEFAULT 0,
    sped_line NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
);
END;

-- SINISTROS: Gestão
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'claims_management') AND type = 'U')
BEGIN
CREATE TABLE claims_management (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    claim_number VARCHAR(50) NOT NULL UNIQUE,
    claim_date DATE NOT NULL,
    claim_type VARCHAR(50) NOT NULL,
    asset_type VARCHAR(50),
    vehicle_id INT,
    asset_description NVARCHAR(MAX),
    estimated_damage DECIMAL(15,2),
    franchise_amount DECIMAL(15,2),
    insurance_coverage DECIMAL(15,2),
    deductible_amount DECIMAL(15,2),
    insurance_company VARCHAR(255),
    policy_number VARCHAR(100),
    claim_status VARCHAR(30) DEFAULT 'OPENED',
    third_party_fault BIT DEFAULT 0,
    third_party_name VARCHAR(255),
    third_party_insurance VARCHAR(255),
    recoverable_from_third DECIMAL(15,2),
    franchise_posted BIT DEFAULT 0,
    franchise_journal_entry_id INT,
    receivable_posted BIT DEFAULT 0,
    receivable_journal_entry_id INT,
    income_posted BIT DEFAULT 0,
    income_journal_entry_id INT,
    police_report_number VARCHAR(100),
    reported_by INT,
    handled_by INT,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE()
);
END;

-- INTERCOMPANY: Alocações
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'intercompany_allocations') AND type = 'U')
BEGIN
CREATE TABLE intercompany_allocations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    allocation_period VARCHAR(7) NOT NULL,
    allocation_date DATE NOT NULL,
    source_branch_id INT NOT NULL,
    source_account_id INT NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    allocation_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT',
    approved_by INT,
    approved_at DATETIME,
    posted BIT DEFAULT 0,
    posted_at DATETIME,
    notes NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
);
END;

-- INTERCOMPANY: Detalhes da Alocação
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'intercompany_allocation_details') AND type = 'U')
BEGIN
CREATE TABLE intercompany_allocation_details (
    id INT IDENTITY(1,1) PRIMARY KEY,
    allocation_id INT NOT NULL,
    target_branch_id INT NOT NULL,
    target_account_id INT NOT NULL,
    allocation_percentage DECIMAL(5,2),
    allocated_amount DECIMAL(15,2) NOT NULL,
    journal_entry_id INT,
    created_at DATETIME DEFAULT GETDATE()
);
END;

-- ESG: Emissões de Carbono
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'carbon_emissions') AND type = 'U')
BEGIN
CREATE TABLE carbon_emissions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    organization_id INT NOT NULL,
    document_type VARCHAR(20) NOT NULL,
    document_id INT,
    document_number VARCHAR(50),
    vehicle_id INT,
    fuel_type VARCHAR(20) DEFAULT 'DIESEL',
    fuel_consumed_liters DECIMAL(10,2),
    distance_km DECIMAL(10,2),
    fuel_efficiency DECIMAL(5,2),
    emission_factor DECIMAL(5,3) DEFAULT 2.600,
    co2_emission_kg DECIMAL(10,3),
    co2_emission_tons DECIMAL(10,6),
    customer_id INT,
    customer_name VARCHAR(255),
    emission_date DATE NOT NULL,
    offset_status VARCHAR(20) DEFAULT 'NONE',
    offset_certificate_url NVARCHAR(MAX),
    offset_project_name VARCHAR(255),
    offset_date DATE,
    created_at DATETIME DEFAULT GETDATE()
);
END;

-- ============================================================================
-- CRIAÇÃO DOS ÍNDICES
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_driver_journey_date' AND object_id = OBJECT_ID('driver_work_journey'))
    CREATE INDEX idx_driver_journey_date ON driver_work_journey(driver_id, journey_date);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_tax_matrix_route' AND object_id = OBJECT_ID('fiscal_tax_matrix'))
    CREATE INDEX idx_tax_matrix_route ON fiscal_tax_matrix(uf_origin, uf_destination);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_wms_billing_customer' AND object_id = OBJECT_ID('wms_billing_events'))
    CREATE INDEX idx_wms_billing_customer ON wms_billing_events(customer_id, event_date);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_ciap_asset' AND object_id = OBJECT_ID('ciap_control'))
    CREATE INDEX idx_ciap_asset ON ciap_control(asset_id);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_claims_status' AND object_id = OBJECT_ID('claims_management'))
    CREATE INDEX idx_claims_status ON claims_management(claim_status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_carbon_date' AND object_id = OBJECT_ID('carbon_emissions'))
    CREATE INDEX idx_carbon_date ON carbon_emissions(emission_date);

-- ============================================================================
-- MIGRATION SIMPLIFICADA COMPLETA!
-- ============================================================================












