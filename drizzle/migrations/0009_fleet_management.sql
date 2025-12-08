-- Migration: Fleet Management (Gestão de Frota)
-- Cria tabelas drivers e vehicles

-- 1. Criar tabela drivers
CREATE TABLE drivers (
  id int IDENTITY(1,1) PRIMARY KEY,
  organization_id int NOT NULL,
  
  -- Dados Pessoais
  name nvarchar(255) NOT NULL,
  cpf nvarchar(14) NOT NULL,
  phone nvarchar(20),
  email nvarchar(255),
  
  -- CNH
  cnh_number nvarchar(20) NOT NULL,
  cnh_category nvarchar(5) NOT NULL,
  cnh_expiry datetime2 NOT NULL,
  cnh_issue_date datetime2,
  
  -- Relacionamentos
  partner_id int,
  
  -- Status
  status nvarchar(20) DEFAULT 'ACTIVE',
  notes nvarchar(max),
  
  -- Enterprise Base
  created_by nvarchar(255) NOT NULL,
  updated_by nvarchar(255),
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  version int DEFAULT 1 NOT NULL,
  
  -- FKs
  CONSTRAINT FK_drivers_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT FK_drivers_partner FOREIGN KEY (partner_id) REFERENCES business_partners(id)
);

-- 2. Criar tabela vehicles
CREATE TABLE vehicles (
  id int IDENTITY(1,1) PRIMARY KEY,
  organization_id int NOT NULL,
  branch_id int NOT NULL,
  
  -- Identificação
  plate nvarchar(10) NOT NULL,
  renavam nvarchar(20),
  chassis nvarchar(30),
  
  -- Tipo
  type nvarchar(20) NOT NULL,
  
  -- Dados
  brand nvarchar(100),
  model nvarchar(100),
  year int,
  color nvarchar(50),
  
  -- Capacidades
  capacity_kg decimal(18, 2) DEFAULT 0.00,
  capacity_m3 decimal(18, 2) DEFAULT 0.00,
  tara_kg decimal(18, 2) DEFAULT 0.00,
  
  -- Controle Operacional
  status nvarchar(20) DEFAULT 'AVAILABLE',
  current_km int DEFAULT 0,
  
  -- Manutenção
  maintenance_status nvarchar(20) DEFAULT 'OK',
  last_maintenance_date datetime2,
  next_maintenance_km int,
  
  -- Documentação
  license_plate_expiry datetime2,
  insurance_expiry datetime2,
  
  -- Observações
  notes nvarchar(max),
  
  -- Enterprise Base
  created_by nvarchar(255) NOT NULL,
  updated_by nvarchar(255),
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  version int DEFAULT 1 NOT NULL,
  
  -- FKs
  CONSTRAINT FK_vehicles_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT FK_vehicles_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Índices únicos
CREATE UNIQUE INDEX idx_drivers_cpf_org ON drivers(cpf, organization_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_vehicles_plate_org ON vehicles(plate, organization_id) WHERE deleted_at IS NULL;

-- Índices para performance
CREATE INDEX idx_drivers_org ON drivers(organization_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_vehicles_org_branch ON vehicles(organization_id, branch_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_type ON vehicles(type);


