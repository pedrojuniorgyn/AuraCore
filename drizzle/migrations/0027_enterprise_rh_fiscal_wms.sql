-- ============================================================================
-- MIGRATION 0027: RH ESPECIALIZADO + FISCAL + WMS + CIAP + SINISTROS + ESG
-- ============================================================================
-- Continuação da estrutura Enterprise
-- ============================================================================

-- ============================================================================
-- PARTE 2: RH ESPECIALIZADO - LEI DO MOTORISTA (Lei 13.103/2015)
-- ============================================================================

-- 2.1 CONTAS DE FOLHA DE PAGAMENTO VARIÁVEL
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '4.2.1', 'CUSTOS DE PESSOAL OPERACIONAL', 'Folha de pagamento operacional', 'EXPENSE', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.2.1' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.2.1.01', 'Salários e Variáveis - Motoristas', 'Remuneração base e variável', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1);

-- Contas Analíticas - Lei do Motorista
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '4.2.1.01.001', 'Salário Base - Motoristas', 'Salário fixo mensal', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.01.002', 'Horas Extras (50% e 100%)', 'HE normal e domingos/feriados', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.01.003', 'Adicional Noturno (20%)', 'Jornada 22h às 5h', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.01.004', 'Diárias de Viagem (Ajuda de Custo)', 'Sem natureza salarial', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.01.005', 'Horas de Espera (Indenizatória 30%)', 'Carga/descarga - Sem encargo', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.01.006', 'Prêmio por Produtividade / Km Rodado', 'Variável desempenho - Natureza salarial', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.01.007', 'Prêmio por Economia de Combustível', 'Gatilho módulo abastecimento', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.01.008', 'DSR sobre Variáveis', 'Descanso semanal remunerado', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.01.009', 'Adicional de Periculosidade (30%)', 'Cargas perigosas (tanque/químico)', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.01.010', 'Adicional de Insalubridade', 'Resíduos/lixo/ambiente insalubre', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

-- Encargos Sociais
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.2.1.02', 'Encargos Sociais - Motoristas', 'INSS, FGTS, PIS', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.2.1.02' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '4.2.1.02.001', 'INSS Patronal (20%)', 'Sobre folha de pagamento', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.02' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.02.002', 'FGTS (8%)', 'Fundo garantia', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.02' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.02.003', 'PIS sobre Folha (1%)', 'Contribuição social', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.02' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.02.004', 'Seguro Acidente de Trabalho (SAT/RAT)', 'Variável 1% a 3%', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.02' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.2.1.02.005', 'Terceiros (Sistema S)', 'SESC, SENAC, SEBRAE', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.2.1.02' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

-- 2.2 TABELA DE JORNADA DE MOTORISTAS (Integração Rastreamento)
CREATE TABLE IF NOT EXISTS driver_work_journey (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id),
    driver_id INT NOT NULL REFERENCES drivers(id),
    vehicle_id INT REFERENCES vehicles(id),
    journey_date DATE NOT NULL,
    
    -- Tempos calculados automaticamente do rastreamento
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    total_driving_hours DECIMAL(5,2) DEFAULT 0,
    total_rest_hours DECIMAL(5,2) DEFAULT 0,
    total_waiting_hours DECIMAL(5,2) DEFAULT 0,
    
    -- Flags de Alerta
    exceeded_max_driving BOOLEAN DEFAULT FALSE,
    insufficient_rest BOOLEAN DEFAULT FALSE,
    
    -- Valores calculados para folha
    regular_hours DECIMAL(5,2) DEFAULT 0,
    overtime_50 DECIMAL(5,2) DEFAULT 0,
    overtime_100 DECIMAL(5,2) DEFAULT 0,
    night_hours DECIMAL(5,2) DEFAULT 0,
    waiting_hours DECIMAL(5,2) DEFAULT 0,
    
    -- Valores monetários
    base_salary_day DECIMAL(10,2),
    waiting_amount DECIMAL(10,2),
    overtime_amount DECIMAL(10,2),
    night_amount DECIMAL(10,2),
    
    -- Rastreabilidade
    tracking_macro_id VARCHAR(100),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(driver_id, journey_date)
);

CREATE INDEX idx_driver_journey_date ON driver_work_journey(driver_id, journey_date);
CREATE INDEX idx_driver_journey_processed ON driver_work_journey(processed);
CREATE INDEX idx_driver_journey_alerts ON driver_work_journey(exceeded_max_driving, insufficient_rest);

-- 2.3 TABELA DE CONFIGURAÇÃO DE PRÊMIOS
CREATE TABLE IF NOT EXISTS driver_performance_config (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id),
    config_name VARCHAR(255) NOT NULL,
    
    -- Prêmio por KM
    km_bonus_enabled BOOLEAN DEFAULT FALSE,
    km_bonus_per_unit DECIMAL(10,4),
    km_minimum_threshold INT,
    
    -- Prêmio por Economia de Combustível
    fuel_bonus_enabled BOOLEAN DEFAULT FALSE,
    fuel_target_average DECIMAL(5,2),
    fuel_bonus_percentage DECIMAL(5,2),
    
    -- Adicional Periculosidade
    dangerous_cargo_bonus BOOLEAN DEFAULT FALSE,
    dangerous_cargo_percentage DECIMAL(5,2) DEFAULT 30.00,
    
    -- Adicional Insalubridade
    unhealthy_bonus BOOLEAN DEFAULT FALSE,
    unhealthy_percentage DECIMAL(5,2) DEFAULT 20.00,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PARTE 3: INTELIGÊNCIA FISCAL - MATRIZ TRIBUTÁRIA
-- ============================================================================

-- 3.1 CONTAS DE DIFAL E FCP
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '3.2.1.03', 'DIFAL a Recolher (Partilha ICMS)', 'Diferencial de alíquota interestadual', 'EXPENSE', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.2.1.03' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '3.2.1.03.001', '(-) DIFAL UF Origem (Transportadora)', 'Parte fica no estado origem', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '3.2.1.03' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '3.2.1.03.002', '(-) DIFAL UF Destino (Cliente)', 'Parte vai para estado destino', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '3.2.1.03' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '3.2.1.04', 'FCP - Fundo Combate Pobreza', 'Adicional de ICMS por estado', 'EXPENSE', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.2.1.04' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '3.2.1.04.001', '(-) FCP a Recolher', 'Adicional 1% a 2% por UF', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '3.2.1.04' AND organization_id = 1), TRUE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.2.1.04.001' AND organization_id = 1);

-- 3.2 TABELA DE MATRIZ TRIBUTÁRIA (Tax Engine)
CREATE TABLE IF NOT EXISTS fiscal_tax_matrix (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id),
    
    -- Rota
    uf_origin VARCHAR(2) NOT NULL,
    uf_destination VARCHAR(2) NOT NULL,
    
    -- Classificação da Carga
    cargo_type VARCHAR(50) DEFAULT 'GERAL',
    
    -- Tipo de Contribuinte
    is_icms_contributor BOOLEAN DEFAULT TRUE,
    
    -- Situação Tributária
    cst_code VARCHAR(3) NOT NULL,
    cst_description VARCHAR(255),
    
    -- Alíquotas
    icms_rate DECIMAL(5,2) NOT NULL,
    fcp_rate DECIMAL(5,2) DEFAULT 0,
    
    -- DIFAL (quando aplicável)
    difal_applicable BOOLEAN DEFAULT FALSE,
    difal_origin_percentage DECIMAL(5,2) DEFAULT 0,
    difal_destination_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Regras Especiais
    tax_benefit_code VARCHAR(50),
    tax_benefit_description TEXT,
    requires_st BOOLEAN DEFAULT FALSE,
    
    -- Validação
    is_active BOOLEAN DEFAULT TRUE,
    valid_from DATE,
    valid_until DATE,
    
    -- Observações
    legal_basis TEXT,
    business_rule TEXT,
    alert_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor)
);

CREATE INDEX idx_tax_matrix_route ON fiscal_tax_matrix(uf_origin, uf_destination);
CREATE INDEX idx_tax_matrix_cargo ON fiscal_tax_matrix(cargo_type);
CREATE INDEX idx_tax_matrix_active ON fiscal_tax_matrix(is_active);

-- 3.3 SEED DA MATRIZ TRIBUTÁRIA (Casos Comuns)
INSERT INTO fiscal_tax_matrix (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, cst_description, icms_rate, fcp_rate, legal_basis)
SELECT * FROM (VALUES
  (1, 'SP', 'RJ', 'GERAL', TRUE, '00', 'Tributação Normal', 12.00, 0.00, 'Resolução SF 13/2012'),
  (1, 'SP', 'MG', 'GERAL', TRUE, '00', 'Tributação Normal', 12.00, 0.00, 'Resolução SF 13/2012'),
  (1, 'SP', 'BA', 'GERAL', TRUE, '00', 'Tributação Normal', 7.00, 2.00, 'Lei Estadual BA 7014/96'),
  (1, 'SP', 'RS', 'GERAL', TRUE, '00', 'Tributação Normal', 12.00, 0.00, 'Resolução SF 13/2012'),
  (1, 'SP', 'PR', 'GERAL', TRUE, '00', 'Tributação Normal', 12.00, 0.00, 'Resolução SF 13/2012'),
  (1, 'SP', 'MT', 'GRAOS', TRUE, '40', 'Isenta (Convênio ICMS 100/97)', 0.00, 0.00, 'Convênio ICMS 100/97'),
  (1, 'SP', 'GO', 'GRAOS', TRUE, '40', 'Isenta (Convênio ICMS 100/97)', 0.00, 0.00, 'Convênio ICMS 100/97'),
  (1, 'SP', 'BA', 'GERAL', FALSE, '00', 'Tributação c/ DIFAL', 7.00, 2.00, 'EC 87/2015 + Lei BA'),
  (1, 'SP', 'PE', 'GERAL', FALSE, '00', 'Tributação c/ DIFAL', 7.00, 2.00, 'EC 87/2015 + Lei PE'),
  (1, 'SP', 'RJ', 'PERIGOSO', TRUE, '00', 'Tributação Normal - Perigoso', 12.00, 0.00, 'Resolução SF 13/2012'),
  (1, 'SP', 'AM', 'GERAL', TRUE, '40', 'Isenta (Zona Franca)', 0.00, 0.00, 'Decreto-Lei 288/67')
) AS v(organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, cst_description, icms_rate, fcp_rate, legal_basis)
WHERE NOT EXISTS (
  SELECT 1 FROM fiscal_tax_matrix 
  WHERE organization_id = v.organization_id 
    AND uf_origin = v.uf_origin 
    AND uf_destination = v.uf_destination 
    AND cargo_type = v.cargo_type 
    AND is_icms_contributor = v.is_icms_contributor
);

-- Atualizar DIFAL onde aplicável
UPDATE fiscal_tax_matrix 
SET difal_applicable = TRUE, 
    difal_origin_percentage = 40.00, 
    difal_destination_percentage = 60.00
WHERE is_icms_contributor = FALSE 
  AND cst_code = '00';

-- 3.4 TABELA DE LOG DE VALIDAÇÃO FISCAL
CREATE TABLE IF NOT EXISTS fiscal_validation_log (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id),
    
    -- Documento
    document_type VARCHAR(20) NOT NULL,
    document_number VARCHAR(50),
    document_id INT,
    
    -- Validação
    validation_type VARCHAR(50) NOT NULL,
    validation_status VARCHAR(20) NOT NULL,
    
    -- Detalhes
    uf_origin VARCHAR(2),
    uf_destination VARCHAR(2),
    cargo_type VARCHAR(50),
    
    -- Resultado
    rule_found BOOLEAN DEFAULT FALSE,
    icms_rate_applied DECIMAL(5,2),
    fcp_rate_applied DECIMAL(5,2),
    cst_applied VARCHAR(3),
    
    -- Mensagens
    warning_message TEXT,
    error_message TEXT,
    suggested_action TEXT,
    
    -- Usuário
    user_id INT,
    user_override BOOLEAN DEFAULT FALSE,
    override_justification TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fiscal_validation_doc ON fiscal_validation_log(document_type, document_number);
CREATE INDEX idx_fiscal_validation_status ON fiscal_validation_log(validation_status);
CREATE INDEX idx_fiscal_validation_date ON fiscal_validation_log(created_at);

-- ============================================================================
-- PARTE 4: WMS - FATURAMENTO LOGÍSTICO (Billing Engine)
-- ============================================================================

-- 4.1 CONTAS DE RECEITA LOGÍSTICA
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '3.1.2', 'RECEITAS DE SERVIÇOS LOGÍSTICOS', 'Armazenagem e operações WMS', 'REVENUE', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.1.2' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '3.1.2.01', 'Receitas de Armazenagem (Storage)', 'Cobrança por posição/período', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.1.2.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '3.1.2.01.001', 'Receita de Armazenagem (Posição Pallet)', 'Snapshot estoque dia 15/30', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '3.1.2.01.002', 'Receita de Armazenagem (Ad Valorem)', '% sobre valor NF estoque', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '3.1.2.02', 'Receitas de Movimentação (Handling)', 'Entrada e saída de mercadorias', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.1.2.02' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '3.1.2.02.001', 'Receita de Inbound (Descarga/Conferência)', 'Por pallet ou caixa entrada', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2.02' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '3.1.2.02.002', 'Receita de Outbound (Picking/Expedição)', 'Por linha pedido/caixa saída', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2.02' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '3.1.2.03', 'Receitas de Serviços Agregados', 'Cross-docking e serviços extras', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '3.1.2.03' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '3.1.2.03.001', 'Receita de Cross-Docking', 'Taxa passagem < 24h', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2.03' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '3.1.2.03.002', 'Receita de Serviços Extras (Etiquetagem)', 'Por etiqueta bipada/colada', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2.03' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '3.1.2.03.003', 'Receita de Kitting / Montagem', 'Serviços valor agregado', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2.03' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '3.1.2.03.004', 'Receita de Devolução / Logística Reversa', 'Tratamento de devoluções', 'REVENUE', (SELECT id FROM financial_chart_accounts WHERE code = '3.1.2.03' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

-- 4.2 TABELA DE EVENTOS WMS PARA FATURAMENTO
CREATE TABLE IF NOT EXISTS wms_billing_events (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id),
    
    -- Cliente e Contrato
    customer_id INT NOT NULL REFERENCES partners(id),
    contract_id INT,
    
    -- Evento
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Quantidades
    quantity DECIMAL(10,2) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    
    -- Valores
    unit_price DECIMAL(10,4) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    
    -- Conta Contábil Destino
    revenue_account_id INT REFERENCES financial_chart_accounts(id),
    
    -- Rastreabilidade
    related_document_type VARCHAR(50),
    related_document_id INT,
    related_document_number VARCHAR(100),
    
    -- Status de Faturamento
    billing_status VARCHAR(20) DEFAULT 'PENDING',
    billing_period VARCHAR(7),
    pre_invoice_id INT,
    invoice_id INT,
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wms_billing_customer ON wms_billing_events(customer_id, event_date);
CREATE INDEX idx_wms_billing_period ON wms_billing_events(billing_period, billing_status);
CREATE INDEX idx_wms_billing_status ON wms_billing_events(billing_status);

-- 4.3 TABELA DE PRÉ-FATURAS WMS
CREATE TABLE IF NOT EXISTS wms_pre_invoices (
    id SERIAL PRIMARY KEY,
    organization_id INT NOT NULL REFERENCES organizations(id),
    
    -- Cliente
    customer_id INT NOT NULL REFERENCES partners(id),
    
    -- Período
    billing_period VARCHAR(7) NOT NULL,
    measurement_date DATE NOT NULL,
    
    -- Totalizadores
    total_storage DECIMAL(15,2) DEFAULT 0,
    total_inbound DECIMAL(15,2) DEFAULT 0,
    total_outbound DECIMAL(15,2) DEFAULT 0,
    total_extras DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) NOT NULL,
    
    -- Impostos
    iss_rate DECIMAL(5,2) DEFAULT 0,
    iss_amount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,
    
    -- Aprovação Cliente
    status VARCHAR(20) DEFAULT 'DRAFT',
    sent_to_customer_at TIMESTAMP,
    customer_approved_at TIMESTAMP,
    customer_rejected_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- NFS-e Gerada
    invoice_number VARCHAR(50),
    invoice_issued_at TIMESTAMP,
    invoice_due_date DATE,
    
    -- Documentos
    pdf_url TEXT,
    xml_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(organization_id, customer_id, billing_period)
);

CREATE INDEX idx_wms_pre_invoice_customer ON wms_pre_invoices(customer_id, billing_period);
CREATE INDEX idx_wms_pre_invoice_status ON wms_pre_invoices(status);

-- ============================================================================
-- PARTE 5: GERENCIAMENTO DE RISCO (GR)
-- ============================================================================

-- 5.1 CONTAS DE CUSTOS DE PREVENÇÃO
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, is_analytical, status) 
SELECT 1, '4.1.4', 'CUSTOS DE GERENCIAMENTO DE RISCO', 'Prevenção de perdas e roubos', 'EXPENSE', FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.1.4' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.1.4.01', 'Tecnologia de Rastreamento', 'Equipamentos e monitoramento', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.1.4' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.1.4.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '4.1.4.01.001', 'Monitoramento e Rastreamento (Satelital)', 'Mensalidade Autotrac/Omnilink/Sascar', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.1.4.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.1.4.01.002', 'Escolta Armada (Ad Hoc)', 'Viatura para carga valiosa', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.1.4.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.1.4.01.003', 'Isca de Carga (Portátil)', 'Rastreador descartável', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.1.4.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '4.1.4.01.004', 'Consulta de Cadastro (Telerisco/Buonny)', 'R$ 5-20 por consulta CPF', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.1.4.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.1.4.02', 'Gerenciadoras de Risco', 'Torres de controle', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.1.4' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.1.4.02' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '4.1.4.02.001', 'Gerenciadora de Risco (Fee Mensal)', 'Pamcary, Buonny, etc', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '4.1.4.02' AND organization_id = 1), TRUE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '4.1.4.02.001' AND organization_id = 1);

-- ============================================================================
-- PARTE 6: CUSTOS DE TI E INTEGRAÇÃO
-- ============================================================================

-- 6.1 CONTAS DE TECNOLOGIA
INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.1.5', 'TECNOLOGIA E INFRAESTRUTURA', 'Custos de TI operacional', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1.5' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status) 
SELECT 1, '5.1.5.01', 'Cloud e Hospedagem', 'Infraestrutura em nuvem', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.5' AND organization_id = 1), FALSE, 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = '5.1.5.01' AND organization_id = 1);

INSERT INTO financial_chart_accounts (organization_id, code, name, description, account_type, parent_id, is_analytical, status)
SELECT * FROM (VALUES
  (1, '5.1.5.01.001', 'Custos de Nuvem (AWS/Azure/GCP)', 'Hospedagem ERP e BD', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.5.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.1.5.01.002', 'APIs de Terceiros (Google Maps/Here)', 'Custo por requisição', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.5.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.1.5.01.003', 'VAN de EDI (Troca de Arquivos)', 'Custo por KB trafegado', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.5.01' AND organization_id = 1), TRUE, 'ACTIVE'),
  (1, '5.1.5.01.004', 'Licenças de Software (SaaS)', 'Mensalidades de ferramentas', 'EXPENSE', (SELECT id FROM financial_chart_accounts WHERE code = '5.1.5.01' AND organization_id = 1), TRUE, 'ACTIVE')
) AS v(organization_id, code, name, description, account_type, parent_id, is_analytical, status)
WHERE NOT EXISTS (SELECT 1 FROM financial_chart_accounts WHERE code = v.code AND organization_id = 1);

-- Continua na próxima parte...






















