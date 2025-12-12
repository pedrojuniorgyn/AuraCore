-- ==========================================
-- MIGRATION 0013: MVP OPERACIONAL COMPLETO
-- ==========================================
-- Tabelas: Tax Matrix, Freight Pricing v2, Torre Controle, CTe, MDFe, TMS
-- Data: 2024-12-07
-- ==========================================

-- MATRIZ TRIBUTÁRIA (Expandida)
CREATE TABLE tax_matrix (
  id INT PRIMARY KEY IDENTITY(1,1),
  organization_id INT NOT NULL,
  
  -- Geografia
  origin_uf NVARCHAR(2) NOT NULL,
  destination_uf NVARCHAR(2) NOT NULL,
  
  -- ICMS
  icms_rate DECIMAL(5,2) NOT NULL,
  icms_st_rate DECIMAL(5,2),
  icms_reduction DECIMAL(5,2) DEFAULT 0.00,
  fcp_rate DECIMAL(5,2) DEFAULT 0.00,
  
  -- CFOP
  cfop_internal NVARCHAR(4),
  cfop_interstate NVARCHAR(4),
  
  -- CST
  cst NVARCHAR(2) DEFAULT '00',
  
  -- Regime
  regime NVARCHAR(30) DEFAULT 'NORMAL',
  
  -- Vigência
  valid_from DATETIME2 NOT NULL,
  valid_to DATETIME2,
  
  -- Observações
  notes NVARCHAR(500),
  
  -- Status
  status NVARCHAR(20) DEFAULT 'ACTIVE',
  
  -- Enterprise Base
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL
);

CREATE UNIQUE INDEX idx_tax_matrix_route_regime_org ON tax_matrix(origin_uf, destination_uf, regime, organization_id) 
WHERE deleted_at IS NULL;

-- FREIGHT TABLE PRICES (Preços por Rota)
CREATE TABLE freight_table_prices (
  id INT PRIMARY KEY IDENTITY(1,1),
  freight_table_route_id INT NOT NULL,
  
  min_weight DECIMAL(18,2),
  max_weight DECIMAL(18,2),
  vehicle_type_id INT,
  
  price DECIMAL(18,2) NOT NULL,
  excess_price DECIMAL(18,2) DEFAULT 0.00,
  
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2
);

-- FREIGHT GENERALITIES (Taxas Extras Refinadas)
CREATE TABLE freight_generalities (
  id INT PRIMARY KEY IDENTITY(1,1),
  freight_table_id INT NOT NULL,
  
  name NVARCHAR(100) NOT NULL,
  code NVARCHAR(50),
  
  type NVARCHAR(30) NOT NULL, -- PERCENTAGE, FIXED, PER_KG
  
  value DECIMAL(18,2) NOT NULL,
  min_value DECIMAL(18,2) DEFAULT 0.00,
  max_value DECIMAL(18,2),
  
  incidence NVARCHAR(30) DEFAULT 'ALWAYS', -- ALWAYS, ON_WEIGHT, ON_VALUE
  
  is_active NVARCHAR(10) DEFAULT 'true',
  apply_order INT DEFAULT 0,
  
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2
);

-- FREIGHT QUOTES (Torre de Controle Comercial)
CREATE TABLE freight_quotes (
  id INT PRIMARY KEY IDENTITY(1,1),
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  quote_number NVARCHAR(20) NOT NULL UNIQUE,
  
  customer_id INT NOT NULL,
  contact_name NVARCHAR(100),
  contact_phone NVARCHAR(20),
  contact_email NVARCHAR(100),
  
  origin_uf NVARCHAR(2) NOT NULL,
  origin_city_id INT,
  origin_address NVARCHAR(500),
  destination_uf NVARCHAR(2) NOT NULL,
  destination_city_id INT,
  destination_address NVARCHAR(500),
  
  cargo_description NVARCHAR(500),
  weight_kg DECIMAL(18,2),
  volume_m3 DECIMAL(18,2),
  invoice_value DECIMAL(18,2),
  
  transport_type NVARCHAR(20),
  service_level NVARCHAR(20),
  
  pickup_date DATETIME2,
  delivery_deadline DATETIME2,
  
  customer_target_price DECIMAL(18,2),
  calculated_price DECIMAL(18,2),
  quoted_price DECIMAL(18,2),
  discount_percent DECIMAL(5,2),
  discount_reason NVARCHAR(200),
  
  price_breakdown NVARCHAR(MAX),
  
  status NVARCHAR(20) NOT NULL DEFAULT 'NEW',
  rejection_reason NVARCHAR(200),
  
  quoted_by NVARCHAR(100),
  quoted_at DATETIME2,
  approved_by NVARCHAR(100),
  approved_at DATETIME2,
  accepted_by_customer NVARCHAR(100),
  accepted_at DATETIME2,
  
  pickup_order_id INT,
  
  notes NVARCHAR(1000),
  
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL
);

-- PICKUP ORDERS (Ordens de Coleta)
CREATE TABLE pickup_orders (
  id INT PRIMARY KEY IDENTITY(1,1),
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  order_number NVARCHAR(20) NOT NULL UNIQUE,
  
  quote_id INT,
  
  customer_id INT NOT NULL,
  
  origin_uf NVARCHAR(2) NOT NULL,
  origin_city_id INT,
  origin_address NVARCHAR(500),
  destination_uf NVARCHAR(2) NOT NULL,
  destination_city_id INT,
  destination_address NVARCHAR(500),
  
  cargo_description NVARCHAR(500),
  weight_kg DECIMAL(18,2),
  volume_m3 DECIMAL(18,2),
  invoice_value DECIMAL(18,2),
  
  agreed_price DECIMAL(18,2),
  
  vehicle_id INT,
  driver_id INT,
  allocated_at DATETIME2,
  allocated_by NVARCHAR(100),
  
  scheduled_pickup_date DATETIME2,
  actual_pickup_datetime DATETIME2,
  
  insurance_policy NVARCHAR(50),
  insurance_certificate NVARCHAR(50),
  insurance_company NVARCHAR(200),
  
  status NVARCHAR(20) NOT NULL DEFAULT 'PENDING_ALLOCATION',
  
  cte_id INT,
  trip_id INT,
  
  notes NVARCHAR(1000),
  
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL
);

-- CTe HEADER
CREATE TABLE cte_header (
  id INT PRIMARY KEY IDENTITY(1,1),
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  cte_number INT NOT NULL,
  serie NVARCHAR(3) DEFAULT '1',
  model NVARCHAR(2) DEFAULT '57',
  cte_key NVARCHAR(44),
  
  issue_date DATETIME2 NOT NULL,
  
  pickup_order_id INT,
  trip_id INT,
  
  sender_id INT,
  recipient_id INT,
  shipper_id INT,
  receiver_id INT,
  taker_id INT NOT NULL,
  taker_type NVARCHAR(20),
  
  origin_uf NVARCHAR(2) NOT NULL,
  origin_city_id INT,
  destination_uf NVARCHAR(2) NOT NULL,
  destination_city_id INT,
  
  service_value DECIMAL(18,2) NOT NULL,
  cargo_value DECIMAL(18,2),
  total_value DECIMAL(18,2) NOT NULL,
  receivable_value DECIMAL(18,2),
  
  icms_base DECIMAL(18,2),
  icms_rate DECIMAL(5,2),
  icms_value DECIMAL(18,2),
  icms_reduction DECIMAL(5,2) DEFAULT 0.00,
  
  insurance_policy NVARCHAR(50) NOT NULL,
  insurance_certificate NVARCHAR(50) NOT NULL,
  insurance_company NVARCHAR(200),
  
  modal NVARCHAR(2) DEFAULT '01',
  
  status NVARCHAR(20) DEFAULT 'DRAFT',
  protocol_number NVARCHAR(20),
  authorization_date DATETIME2,
  cancellation_date DATETIME2,
  cancellation_reason NVARCHAR(500),
  
  xml_signed NVARCHAR(MAX),
  xml_authorized NVARCHAR(MAX),
  
  rejection_code NVARCHAR(10),
  rejection_message NVARCHAR(500),
  
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL
);

-- CTe CARGO DOCUMENTS
CREATE TABLE cte_cargo_documents (
  id INT PRIMARY KEY IDENTITY(1,1),
  cte_header_id INT NOT NULL,
  
  document_type NVARCHAR(10) DEFAULT 'NFE',
  document_key NVARCHAR(44),
  document_number NVARCHAR(20),
  document_serie NVARCHAR(3),
  document_date DATETIME2,
  document_value DECIMAL(18,2),
  
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2
);

-- CTe VALUE COMPONENTS
CREATE TABLE cte_value_components (
  id INT PRIMARY KEY IDENTITY(1,1),
  cte_header_id INT NOT NULL,
  
  component_name NVARCHAR(50),
  component_value DECIMAL(18,2),
  
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2
);

-- MDFe HEADER
CREATE TABLE mdfe_header (
  id INT PRIMARY KEY IDENTITY(1,1),
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  mdfe_number INT NOT NULL,
  serie NVARCHAR(3) DEFAULT '1',
  mdfe_key NVARCHAR(44),
  
  trip_id INT,
  vehicle_id INT NOT NULL,
  driver_id INT NOT NULL,
  
  origin_uf NVARCHAR(2) NOT NULL,
  destination_uf NVARCHAR(2) NOT NULL,
  route NVARCHAR(MAX),
  
  ciot_number NVARCHAR(50),
  
  status NVARCHAR(20) DEFAULT 'DRAFT',
  issue_date DATETIME2 NOT NULL,
  close_date DATETIME2,
  
  protocol_number NVARCHAR(20),
  authorization_date DATETIME2,
  xml_signed NVARCHAR(MAX),
  xml_authorized NVARCHAR(MAX),
  
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL
);

-- MDFe DOCUMENTS
CREATE TABLE mdfe_documents (
  id INT PRIMARY KEY IDENTITY(1,1),
  mdfe_header_id INT NOT NULL,
  cte_header_id INT NOT NULL,
  
  created_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2
);

-- TRIPS (Viagens)
CREATE TABLE trips (
  id INT PRIMARY KEY IDENTITY(1,1),
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  trip_number NVARCHAR(20) NOT NULL UNIQUE,
  
  pickup_order_ids NVARCHAR(MAX),
  
  vehicle_id INT NOT NULL,
  driver_id INT NOT NULL,
  driver_type NVARCHAR(20),
  trailer_1_id INT,
  trailer_2_id INT,
  
  scheduled_start DATETIME2,
  actual_start DATETIME2,
  scheduled_end DATETIME2,
  actual_end DATETIME2,
  
  mdfe_id INT,
  mdfe_status NVARCHAR(20),
  
  requires_ciot NVARCHAR(10) DEFAULT 'false',
  ciot_number NVARCHAR(50),
  ciot_value DECIMAL(18,2),
  ciot_issued_at DATETIME2,
  
  status NVARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  
  estimated_revenue DECIMAL(18,2),
  actual_revenue DECIMAL(18,2),
  estimated_cost DECIMAL(18,2),
  actual_cost DECIMAL(18,2),
  
  notes NVARCHAR(1000),
  
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL
);

-- TRIP STOPS
CREATE TABLE trip_stops (
  id INT PRIMARY KEY IDENTITY(1,1),
  trip_id INT NOT NULL,
  
  stop_type NVARCHAR(20) NOT NULL,
  sequence INT NOT NULL,
  
  business_partner_id INT,
  address NVARCHAR(500),
  city_id INT,
  uf NVARCHAR(2),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  scheduled_datetime DATETIME2,
  actual_arrival DATETIME2,
  actual_departure DATETIME2,
  
  status NVARCHAR(20) DEFAULT 'PENDING',
  
  proof_photo_url NVARCHAR(500),
  signature_url NVARCHAR(500),
  notes NVARCHAR(500),
  
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2
);

-- TRIP DOCUMENTS
CREATE TABLE trip_documents (
  id INT PRIMARY KEY IDENTITY(1,1),
  trip_id INT NOT NULL,
  trip_stop_id INT,
  
  document_type NVARCHAR(10) DEFAULT 'CTE',
  cte_id INT,
  
  created_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2
);

-- ATUALIZAR accounts_payable e accounts_receivable com cost_center_id e chart_account_id
-- (Já foi feito na migration anterior de controladoria)















