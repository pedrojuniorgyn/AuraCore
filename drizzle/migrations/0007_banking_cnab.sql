-- Migration: Banking CNAB Module
-- Adiciona campos CNAB à tabela bank_accounts e cria bank_remittances

-- 1. Adicionar campos CNAB à tabela bank_accounts
ALTER TABLE bank_accounts ADD account_digit nvarchar(2);
ALTER TABLE bank_accounts ADD wallet nvarchar(20);
ALTER TABLE bank_accounts ADD agreement_number nvarchar(50);
ALTER TABLE bank_accounts ADD cnab_layout nvarchar(20) DEFAULT 'CNAB240';
ALTER TABLE bank_accounts ADD next_remittance_number int DEFAULT 1;

-- 2. Criar tabela bank_remittances
CREATE TABLE bank_remittances (
  id int IDENTITY(1,1) PRIMARY KEY,
  organization_id int NOT NULL,
  bank_account_id int NOT NULL,
  
  -- Dados do Arquivo
  file_name nvarchar(255) NOT NULL,
  content nvarchar(max) NOT NULL,
  remittance_number int NOT NULL,
  
  -- Tipo e Status
  type nvarchar(20) NOT NULL, -- 'PAYMENT', 'RECEIVABLE'
  status nvarchar(50) DEFAULT 'GENERATED', -- 'GENERATED', 'SENT', 'PROCESSED_BY_BANK', 'ERROR'
  
  -- Estatísticas
  total_records int DEFAULT 0,
  total_amount decimal(18, 2) DEFAULT 0.00,
  
  -- Observações
  notes nvarchar(max),
  processed_at datetime2,
  
  -- Enterprise Base
  created_by nvarchar(255) NOT NULL,
  created_at datetime2 DEFAULT GETDATE(),
  deleted_at datetime2,
  
  -- FKs
  CONSTRAINT FK_bank_remittances_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT FK_bank_remittances_bank_account FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

-- Índices para performance
CREATE INDEX idx_bank_remittances_org_bank ON bank_remittances(organization_id, bank_account_id);
CREATE INDEX idx_bank_remittances_status ON bank_remittances(status);
CREATE INDEX idx_bank_remittances_created_at ON bank_remittances(created_at DESC);



























