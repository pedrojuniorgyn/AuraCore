-- ==========================================
-- MIGRATION: SPRINTS 2, 3 e 4 COMPLETAS
-- Data: 08/12/2025
-- Módulos: Billing, Docs Frota, Ocorrências, Impostos
-- ==========================================

-- ========================================== 
-- SPRINT 2: BILLING (FATURAMENTO AGRUPADO)
-- ==========================================

CREATE TABLE billing_invoices (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  -- Identificação
  invoice_number NVARCHAR(50) NOT NULL,
  
  -- Cliente
  customer_id INT NOT NULL,
  
  -- Período
  period_start DATETIME2 NOT NULL,
  period_end DATETIME2 NOT NULL,
  
  -- Frequência
  billing_frequency NVARCHAR(20) NOT NULL,
  
  -- Valores
  total_ctes INT NOT NULL,
  gross_value DECIMAL(18,2) NOT NULL,
  discount_value DECIMAL(18,2) DEFAULT 0.00,
  net_value DECIMAL(18,2) NOT NULL,
  
  -- Vencimento
  issue_date DATETIME2 NOT NULL,
  due_date DATETIME2 NOT NULL,
  
  -- Status
  status NVARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  
  -- Integração Financeira
  accounts_receivable_id INT NULL,
  
  -- Boleto
  barcode_number NVARCHAR(54) NULL,
  pix_key NVARCHAR(500) NULL,
  
  -- Documentos
  pdf_url NVARCHAR(500) NULL,
  
  -- Envio
  sent_at DATETIME2 NULL,
  sent_to NVARCHAR(255) NULL,
  
  -- Observações
  notes NVARCHAR(MAX) NULL,
  
  -- Enterprise Base
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_billing_invoices_customer FOREIGN KEY (customer_id) 
    REFERENCES business_partners(id)
);

CREATE TABLE billing_items (
  id INT IDENTITY(1,1) PRIMARY KEY,
  
  billing_invoice_id INT NOT NULL,
  cte_id INT NOT NULL,
  
  -- Cache
  cte_number INT NOT NULL,
  cte_series NVARCHAR(3),
  cte_key NVARCHAR(44),
  cte_issue_date DATETIME2 NOT NULL,
  cte_value DECIMAL(18,2) NOT NULL,
  
  origin_uf NVARCHAR(2),
  destination_uf NVARCHAR(2),
  
  created_at DATETIME2 DEFAULT GETDATE(),
  
  CONSTRAINT FK_billing_items_invoice FOREIGN KEY (billing_invoice_id) 
    REFERENCES billing_invoices(id) ON DELETE CASCADE,
  CONSTRAINT FK_billing_items_cte FOREIGN KEY (cte_id) 
    REFERENCES cte_header(id)
);

-- Índices Billing
CREATE INDEX idx_billing_invoices_customer 
ON billing_invoices(customer_id, status);

CREATE INDEX idx_billing_invoices_period 
ON billing_invoices(period_start, period_end);

CREATE INDEX idx_billing_invoices_due_date 
ON billing_invoices(due_date, status);

CREATE INDEX idx_billing_items_invoice 
ON billing_items(billing_invoice_id);

-- ========================================== 
-- SPRINT 3: DOCUMENTAÇÃO DE FROTA
-- ==========================================

CREATE TABLE vehicle_documents (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  vehicle_id INT NOT NULL,
  
  document_type NVARCHAR(50) NOT NULL,
  -- CRLV, SEGURO, ANTT, IPVA, DPVAT, OUTROS
  
  document_number NVARCHAR(100),
  
  issue_date DATETIME2,
  expiry_date DATETIME2 NOT NULL,
  
  -- Seguro específico
  insurance_company NVARCHAR(255),
  policy_number NVARCHAR(100),
  insured_value DECIMAL(18,2),
  
  -- Arquivo
  file_url NVARCHAR(500),
  file_size INT,
  file_mime_type NVARCHAR(100),
  
  -- Status
  status NVARCHAR(20) DEFAULT 'VALID',
  -- VALID, EXPIRING_SOON, EXPIRED
  
  alert_sent_at DATETIME2,
  
  -- Enterprise Base
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_vehicle_docs_vehicle FOREIGN KEY (vehicle_id) 
    REFERENCES vehicles(id)
);

CREATE TABLE driver_documents (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  driver_id INT NOT NULL,
  
  document_type NVARCHAR(50) NOT NULL,
  -- CNH, MOPP, TOXICOLOGICO, ASO, OUTROS
  
  document_number NVARCHAR(100),
  
  issue_date DATETIME2,
  expiry_date DATETIME2 NOT NULL,
  
  -- CNH específico
  cnh_category NVARCHAR(5),
  
  -- Arquivo
  file_url NVARCHAR(500),
  
  -- Status
  status NVARCHAR(20) DEFAULT 'VALID',
  
  alert_sent_at DATETIME2,
  
  -- Enterprise Base
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_driver_docs_driver FOREIGN KEY (driver_id) 
    REFERENCES drivers(id)
);

-- Índices Documentos
CREATE INDEX idx_vehicle_docs_expiry 
ON vehicle_documents(expiry_date, status);

CREATE INDEX idx_driver_docs_expiry 
ON driver_documents(expiry_date, status);

-- ========================================== 
-- SPRINT 3: OCORRÊNCIAS DE VIAGEM
-- ==========================================

CREATE TABLE trip_occurrences (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  trip_id INT NOT NULL,
  
  occurrence_type NVARCHAR(50) NOT NULL,
  -- DAMAGE, ACCIDENT, THEFT, DELAY, REFUSAL, MECHANICAL, OTHER
  
  severity NVARCHAR(20) NOT NULL,
  -- LOW, MEDIUM, HIGH, CRITICAL
  
  title NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) NOT NULL,
  
  -- Localização
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  address NVARCHAR(500),
  
  -- Evidências
  photos_urls NVARCHAR(MAX),
  documents_urls NVARCHAR(MAX),
  
  -- Responsável
  responsible_party NVARCHAR(50),
  -- DRIVER, CARRIER, CLIENT, THIRD_PARTY
  
  -- Ações
  actions_taken NVARCHAR(MAX),
  
  -- Impacto
  estimated_loss DECIMAL(18,2),
  insurance_claim NVARCHAR(1) DEFAULT 'N',
  insurance_claim_number NVARCHAR(100),
  
  -- Resolução
  status NVARCHAR(20) DEFAULT 'OPEN',
  -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
  
  resolved_at DATETIME2,
  resolution_notes NVARCHAR(MAX),
  
  -- Notificações
  client_notified NVARCHAR(1) DEFAULT 'N',
  client_notified_at DATETIME2,
  
  -- Enterprise Base
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_trip_occurrences_trip FOREIGN KEY (trip_id) 
    REFERENCES trips(id)
);

-- Índices Ocorrências
CREATE INDEX idx_trip_occurrences_trip 
ON trip_occurrences(trip_id);

CREATE INDEX idx_trip_occurrences_status 
ON trip_occurrences(status, severity);

CREATE INDEX idx_trip_occurrences_type 
ON trip_occurrences(occurrence_type, created_at DESC);

-- ========================================== 
-- SPRINT 4: IMPOSTOS RECUPERÁVEIS
-- ==========================================

CREATE TABLE tax_credits (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  invoice_id INT NOT NULL,
  
  tax_type NVARCHAR(20) NOT NULL,
  -- ICMS, PIS, COFINS, IPI
  
  tax_base DECIMAL(18,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  tax_value DECIMAL(18,2) NOT NULL,
  
  is_recoverable NVARCHAR(1) DEFAULT 'S',
  recoverability_reason NVARCHAR(500),
  
  recovered_at DATETIME2,
  recovered_in_period NVARCHAR(7),
  -- YYYY-MM
  
  -- Enterprise Base
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  CONSTRAINT FK_tax_credits_invoice FOREIGN KEY (invoice_id) 
    REFERENCES inbound_invoices(id)
);

-- Índices Impostos
CREATE INDEX idx_tax_credits_invoice 
ON tax_credits(invoice_id);

CREATE INDEX idx_tax_credits_period 
ON tax_credits(recovered_in_period);

CREATE INDEX idx_tax_credits_type 
ON tax_credits(tax_type, is_recoverable);

-- ==========================================
-- FIM DA MIGRATION
-- ==========================================




















