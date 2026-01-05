-- Migration: Financial DDA Inbox (Débito Direto Autorizado)
-- Cria tabela para armazenar boletos recebidos via DDA do banco

CREATE TABLE financial_dda_inbox (
  id int IDENTITY(1,1) PRIMARY KEY,
  organization_id int NOT NULL,
  bank_account_id int NOT NULL,
  
  -- Dados do Boleto (vindo do banco)
  external_id nvarchar(255) NOT NULL,
  beneficiary_name nvarchar(255) NOT NULL,
  beneficiary_document nvarchar(20) NOT NULL,
  
  -- Valores e Datas
  amount decimal(18, 2) NOT NULL,
  due_date datetime2 NOT NULL,
  issue_date datetime2,
  
  -- Código de Barras
  barcode nvarchar(100) NOT NULL,
  digitable_line nvarchar(100),
  
  -- Vinculação e Status
  status nvarchar(20) DEFAULT 'PENDING',
  matched_payable_id int,
  match_score int DEFAULT 0,
  
  -- Observações
  notes nvarchar(max),
  dismissed_reason nvarchar(255),
  
  -- Enterprise Base
  created_at datetime2 DEFAULT GETDATE(),
  updated_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  
  -- FKs
  CONSTRAINT FK_financial_dda_inbox_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT FK_financial_dda_inbox_bank_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  CONSTRAINT FK_financial_dda_inbox_payable FOREIGN KEY (matched_payable_id) REFERENCES accounts_payable(id)
);

-- Índices para performance
CREATE UNIQUE INDEX idx_dda_external_id ON financial_dda_inbox(external_id, bank_account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dda_status ON financial_dda_inbox(status);
CREATE INDEX idx_dda_due_date ON financial_dda_inbox(due_date);
CREATE INDEX idx_dda_org_bank ON financial_dda_inbox(organization_id, bank_account_id);
CREATE INDEX idx_dda_beneficiary_doc ON financial_dda_inbox(beneficiary_document);

-- Adicionar campo barcode à tabela accounts_payable (se não existir)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'accounts_payable') AND name = 'barcode')
BEGIN
  ALTER TABLE accounts_payable ADD barcode nvarchar(100);
END
GO


































