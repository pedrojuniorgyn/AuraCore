-- ==========================================
-- MIGRATION 0012: AUXILIARY TABLES
-- Tabelas Auxiliares (Fundação do Sistema)
-- ==========================================

-- 1. PAYMENT TERMS (Condições de Pagamento)
CREATE TABLE payment_terms (
  id int IDENTITY(1,1) PRIMARY KEY,
  organization_id int NOT NULL,
  
  -- Identificação
  code nvarchar(20) NOT NULL,
  name nvarchar(100) NOT NULL,
  description nvarchar(max),
  
  -- Configuração
  installments int DEFAULT 1 NOT NULL,
  days_interval int DEFAULT 0,
  first_due_days int DEFAULT 0,
  
  -- Tipo
  type nvarchar(20) DEFAULT 'TERM',
  
  -- Status
  status nvarchar(20) DEFAULT 'ACTIVE',
  
  -- Enterprise Base
  created_by nvarchar(255) NOT NULL,
  updated_by nvarchar(255),
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  version int DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_payment_terms_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_payment_terms_code_org 
ON payment_terms(code, organization_id) 
WHERE deleted_at IS NULL;

-- 2. UNITS OF MEASURE (Unidades de Medida)
CREATE TABLE units_of_measure (
  id int IDENTITY(1,1) PRIMARY KEY,
  organization_id int NOT NULL,
  
  -- Identificação
  code nvarchar(10) NOT NULL,
  name nvarchar(100) NOT NULL,
  symbol nvarchar(10),
  
  -- Tipo
  type nvarchar(20) NOT NULL,
  
  -- Conversão
  conversion_factor decimal(18, 6) DEFAULT 1.000000,
  
  -- Status
  status nvarchar(20) DEFAULT 'ACTIVE',
  
  -- Enterprise Base
  created_by nvarchar(255) NOT NULL,
  updated_by nvarchar(255),
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  version int DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_units_of_measure_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_units_of_measure_code_org 
ON units_of_measure(code, organization_id) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_units_of_measure_type ON units_of_measure(type);

-- 3. VEHICLE TYPES (Tipos de Veículo Padronizados)
CREATE TABLE vehicle_types (
  id int IDENTITY(1,1) PRIMARY KEY,
  organization_id int NOT NULL,
  
  -- Identificação
  code nvarchar(20) NOT NULL,
  name nvarchar(100) NOT NULL,
  description nvarchar(max),
  
  -- Categoria
  category nvarchar(30) NOT NULL,
  
  -- Capacidades
  capacity_kg decimal(18, 2) DEFAULT 0.00,
  capacity_m3 decimal(18, 2) DEFAULT 0.00,
  
  -- Características
  axles int DEFAULT 0,
  max_length decimal(18, 2),
  max_height decimal(18, 2),
  max_width decimal(18, 2),
  
  -- Status
  status nvarchar(20) DEFAULT 'ACTIVE',
  
  -- Enterprise Base
  created_by nvarchar(255) NOT NULL,
  updated_by nvarchar(255),
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  version int DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_vehicle_types_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_vehicle_types_code_org 
ON vehicle_types(code, organization_id) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_vehicle_types_category ON vehicle_types(category);
























