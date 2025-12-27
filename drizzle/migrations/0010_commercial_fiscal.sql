-- ==========================================
-- MIGRATION 0010: COMMERCIAL & FISCAL
-- Tabelas de Preço e Regras Fiscais
-- ==========================================

-- 1. TAX RULES (Regras Fiscais de ICMS)
CREATE TABLE tax_rules (
  id int IDENTITY(1,1) PRIMARY KEY,
  organization_id int NOT NULL,
  
  -- Rota Fiscal
  origin_state nvarchar(2) NOT NULL,
  destination_state nvarchar(2) NOT NULL,
  
  -- Alíquotas e CFOP
  icms_rate decimal(5, 2) NOT NULL,
  cfop_transport nvarchar(4),
  
  -- Observações
  notes nvarchar(max),
  
  -- Enterprise Base
  created_by nvarchar(255) NOT NULL,
  updated_by nvarchar(255),
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  version int DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_tax_rules_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Índice único: rota única por organização
CREATE UNIQUE INDEX idx_tax_rules_route_org 
ON tax_rules(origin_state, destination_state, organization_id) 
WHERE deleted_at IS NULL;

-- 2. FREIGHT TABLES (Tabelas de Frete)
CREATE TABLE freight_tables (
  id int IDENTITY(1,1) PRIMARY KEY,
  organization_id int NOT NULL,
  
  -- Identificação
  name nvarchar(255) NOT NULL,
  code nvarchar(50),
  
  -- Tipo
  type nvarchar(30) NOT NULL,
  transport_type nvarchar(30) NOT NULL,
  
  -- Cliente Específico
  customer_id int,
  
  -- Vigência
  valid_from datetime2 NOT NULL,
  valid_to datetime2,
  
  -- Status
  status nvarchar(20) DEFAULT 'ACTIVE',
  description nvarchar(max),
  
  -- Enterprise Base
  created_by nvarchar(255) NOT NULL,
  updated_by nvarchar(255),
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  version int DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_freight_tables_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT FK_freight_tables_customer FOREIGN KEY (customer_id) REFERENCES business_partners(id)
);

CREATE INDEX idx_freight_tables_org ON freight_tables(organization_id);
CREATE INDEX idx_freight_tables_customer ON freight_tables(customer_id);
CREATE INDEX idx_freight_tables_type ON freight_tables(type);
CREATE INDEX idx_freight_tables_transport_type ON freight_tables(transport_type);

-- 3. FREIGHT WEIGHT RANGES (Faixas de Peso)
CREATE TABLE freight_weight_ranges (
  id int IDENTITY(1,1) PRIMARY KEY,
  freight_table_id int NOT NULL,
  
  -- Faixa de Peso
  min_weight decimal(18, 2) NOT NULL,
  max_weight decimal(18, 2),
  
  -- Precificação
  fixed_price decimal(18, 2) NOT NULL,
  price_per_kg_exceeded decimal(18, 2) DEFAULT 0.00,
  
  -- Ordem
  display_order int DEFAULT 0,
  
  -- Base
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  
  CONSTRAINT FK_freight_weight_ranges_table FOREIGN KEY (freight_table_id) REFERENCES freight_tables(id) ON DELETE CASCADE
);

CREATE INDEX idx_freight_weight_ranges_table ON freight_weight_ranges(freight_table_id);
CREATE INDEX idx_freight_weight_ranges_weight ON freight_weight_ranges(min_weight, max_weight);

-- 4. FREIGHT EXTRA COMPONENTS (Componentes Adicionais)
CREATE TABLE freight_extra_components (
  id int IDENTITY(1,1) PRIMARY KEY,
  freight_table_id int NOT NULL,
  
  -- Identificação
  name nvarchar(100) NOT NULL,
  code nvarchar(50),
  
  -- Tipo de Cobrança
  type nvarchar(30) NOT NULL,
  
  -- Valores
  value decimal(18, 2) NOT NULL,
  min_value decimal(18, 2) DEFAULT 0.00,
  max_value decimal(18, 2),
  
  -- Ativo
  is_active nvarchar(10) DEFAULT 'true',
  
  -- Ordem
  apply_order int DEFAULT 0,
  
  -- Base
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  
  CONSTRAINT FK_freight_extra_components_table FOREIGN KEY (freight_table_id) REFERENCES freight_tables(id) ON DELETE CASCADE
);

CREATE INDEX idx_freight_extra_components_table ON freight_extra_components(freight_table_id);
CREATE INDEX idx_freight_extra_components_active ON freight_extra_components(is_active);
























