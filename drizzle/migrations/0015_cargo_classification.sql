-- ==========================================
-- MIGRATION: OPÇÃO A - REPOSITÓRIO DE CARGAS + MULTICTE
-- Data: 08/12/2025
-- Blocos: 1, 2, 3, 4
-- ==========================================

-- ========================================== 
-- BLOCO 1: CLASSIFICAÇÃO DE NFe
-- ==========================================

-- Adicionar campos de classificação em inbound_invoices
ALTER TABLE inbound_invoices 
ADD nfe_type NVARCHAR(20) DEFAULT 'PURCHASE';

ALTER TABLE inbound_invoices 
ADD carrier_cnpj NVARCHAR(14) NULL;

ALTER TABLE inbound_invoices 
ADD carrier_name NVARCHAR(255) NULL;

ALTER TABLE inbound_invoices 
ADD recipient_cnpj NVARCHAR(14) NULL;

ALTER TABLE inbound_invoices 
ADD recipient_name NVARCHAR(255) NULL;

ALTER TABLE inbound_invoices 
ADD recipient_city NVARCHAR(100) NULL;

ALTER TABLE inbound_invoices 
ADD recipient_uf NVARCHAR(2) NULL;

-- Índices para performance
CREATE INDEX idx_inbound_invoices_nfe_type 
ON inbound_invoices(nfe_type, organization_id);

CREATE INDEX idx_inbound_invoices_recipient 
ON inbound_invoices(recipient_uf, recipient_city);

-- ========================================== 
-- BLOCO 2: REPOSITÓRIO DE CARGAS
-- ==========================================

-- Criar tabela cargo_documents
CREATE TABLE cargo_documents (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  -- Vínculo com NFe
  nfe_invoice_id INT NULL,
  
  -- Dados resumidos
  access_key NVARCHAR(44) NOT NULL,
  nfe_number NVARCHAR(20),
  nfe_series NVARCHAR(10),
  
  issuer_cnpj NVARCHAR(14) NOT NULL,
  issuer_name NVARCHAR(255) NOT NULL,
  
  recipient_cnpj NVARCHAR(14) NOT NULL,
  recipient_name NVARCHAR(255) NOT NULL,
  
  -- Rota
  origin_uf NVARCHAR(2),
  origin_city NVARCHAR(100),
  destination_uf NVARCHAR(2),
  destination_city NVARCHAR(100),
  
  -- Valores
  cargo_value DECIMAL(18,2),
  weight DECIMAL(10,3),
  volume DECIMAL(10,3),
  
  -- Status workflow
  status NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  -- Prazo
  issue_date DATETIME2 NOT NULL,
  delivery_deadline DATETIME2,
  
  -- Vínculos TMS/Fiscal
  trip_id INT NULL,
  cte_id INT NULL,
  
  -- Flag CTe Externo (Multicte)
  has_external_cte NVARCHAR(1) DEFAULT 'N',
  
  -- Enterprise Base
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  -- Foreign Keys
  CONSTRAINT FK_cargo_docs_nfe FOREIGN KEY (nfe_invoice_id) 
    REFERENCES inbound_invoices(id),
  CONSTRAINT FK_cargo_docs_trip FOREIGN KEY (trip_id) 
    REFERENCES trips(id),
  CONSTRAINT FK_cargo_docs_cte FOREIGN KEY (cte_id) 
    REFERENCES cte_header(id)
);

-- Índices para performance
CREATE INDEX idx_cargo_docs_status 
ON cargo_documents(status, organization_id);

CREATE INDEX idx_cargo_docs_destination 
ON cargo_documents(destination_uf, destination_city);

CREATE INDEX idx_cargo_docs_deadline 
ON cargo_documents(delivery_deadline);

CREATE INDEX idx_cargo_docs_trip 
ON cargo_documents(trip_id);

CREATE INDEX idx_cargo_docs_cte 
ON cargo_documents(cte_id);

CREATE INDEX idx_cargo_docs_nfe 
ON cargo_documents(nfe_invoice_id);

-- ========================================== 
-- BLOCO 3: RASTREABILIDADE CTe → NFe
-- ==========================================

-- Adicionar rastreabilidade em cte_cargo_documents
ALTER TABLE cte_cargo_documents 
ADD source_invoice_id INT NULL;

ALTER TABLE cte_cargo_documents 
ADD source_cargo_id INT NULL;

-- Foreign Keys
ALTER TABLE cte_cargo_documents
ADD CONSTRAINT FK_cte_cargo_source_invoice 
FOREIGN KEY (source_invoice_id) REFERENCES inbound_invoices(id);

ALTER TABLE cte_cargo_documents
ADD CONSTRAINT FK_cte_cargo_source_cargo 
FOREIGN KEY (source_cargo_id) REFERENCES cargo_documents(id);

-- Índices
CREATE INDEX idx_cte_cargo_source_invoice 
ON cte_cargo_documents(source_invoice_id);

CREATE INDEX idx_cte_cargo_source_cargo 
ON cte_cargo_documents(source_cargo_id);

-- ========================================== 
-- BLOCO 4: CTe EXTERNO (MULTICTE)
-- ==========================================

-- Adicionar campos de origem em cte_header
ALTER TABLE cte_header 
ADD cte_origin NVARCHAR(20) NOT NULL DEFAULT 'INTERNAL';

ALTER TABLE cte_header 
ADD external_emitter NVARCHAR(255) NULL;

ALTER TABLE cte_header 
ADD imported_at DATETIME2 NULL;

-- Índices
CREATE INDEX idx_cte_header_origin 
ON cte_header(cte_origin, organization_id);

CREATE INDEX idx_cte_header_imported 
ON cte_header(imported_at);

-- ==========================================
-- COMMENTS (Documentação)
-- ==========================================

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Tipo de NFe: PURCHASE (compra), CARGO (transporte), RETURN (devolução), OTHER', 
  @level0type = N'SCHEMA', @level0name = 'dbo',
  @level1type = N'TABLE',  @level1name = 'inbound_invoices',
  @level2type = N'COLUMN', @level2name = 'nfe_type';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Repositório de cargas para transporte (NFes de clientes)', 
  @level0type = N'SCHEMA', @level0name = 'dbo',
  @level1type = N'TABLE',  @level1name = 'cargo_documents';

EXEC sp_addextendedproperty 
  @name = N'MS_Description', 
  @value = N'Origem: INTERNAL (emitido pelo sistema) ou EXTERNAL (Multicte/bsoft)', 
  @level0type = N'SCHEMA', @level0name = 'dbo',
  @level1type = N'TABLE',  @level1name = 'cte_header',
  @level2type = N'COLUMN', @level2name = 'cte_origin';

-- ==========================================
-- FIM DA MIGRATION
-- ==========================================
















