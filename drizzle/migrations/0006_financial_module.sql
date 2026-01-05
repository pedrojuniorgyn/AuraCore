-- Migration: Financial Module
-- Created: 2025-12-06
-- Description: Categorias Financeiras, Contas Bancárias, Contas a Pagar e Contas a Receber

-- ============================================
-- CATEGORIAS FINANCEIRAS (Plano de Contas)
-- ============================================

CREATE TABLE financial_categories (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  
  -- Dados
  name NVARCHAR(255) NOT NULL,
  code NVARCHAR(50),
  type NVARCHAR(20) NOT NULL, -- 'INCOME', 'EXPENSE'
  description NVARCHAR(MAX),
  
  -- Enterprise Base
  status NVARCHAR(20) DEFAULT 'ACTIVE',
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  -- Foreign Keys
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE INDEX idx_financial_categories_org ON financial_categories(organization_id);
CREATE INDEX idx_financial_categories_type ON financial_categories(type);

-- ============================================
-- CONTAS BANCÁRIAS
-- ============================================

CREATE TABLE bank_accounts (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT,
  
  -- Dados Bancários
  name NVARCHAR(255) NOT NULL,
  bank_code NVARCHAR(10),
  bank_name NVARCHAR(255),
  agency NVARCHAR(20),
  account_number NVARCHAR(50),
  account_type NVARCHAR(50), -- 'CHECKING', 'SAVINGS', 'INVESTMENT'
  
  -- Saldo
  initial_balance DECIMAL(18,2) DEFAULT 0.00,
  current_balance DECIMAL(18,2) DEFAULT 0.00,
  
  -- Enterprise Base
  status NVARCHAR(20) DEFAULT 'ACTIVE',
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  -- Foreign Keys
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE INDEX idx_bank_accounts_org ON bank_accounts(organization_id);
CREATE INDEX idx_bank_accounts_branch ON bank_accounts(branch_id);

-- ============================================
-- CONTAS A PAGAR
-- ============================================

CREATE TABLE accounts_payable (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  -- Relacionamentos
  partner_id INT,
  category_id INT,
  bank_account_id INT,
  
  -- Dados do Título
  description NVARCHAR(MAX) NOT NULL,
  document_number NVARCHAR(100),
  
  -- Datas
  issue_date DATETIME2 NOT NULL,
  due_date DATETIME2 NOT NULL,
  pay_date DATETIME2,
  
  -- Valores
  amount DECIMAL(18,2) NOT NULL,
  amount_paid DECIMAL(18,2) DEFAULT 0.00,
  discount DECIMAL(18,2) DEFAULT 0.00,
  interest DECIMAL(18,2) DEFAULT 0.00,
  fine DECIMAL(18,2) DEFAULT 0.00,
  
  -- Status e Origem
  status NVARCHAR(20) DEFAULT 'OPEN' NOT NULL, -- 'OPEN', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELED'
  origin NVARCHAR(50) DEFAULT 'MANUAL', -- 'MANUAL', 'FISCAL_NFE', 'FISCAL_CTE', 'IMPORT'
  
  -- Observações
  notes NVARCHAR(MAX),
  
  -- Enterprise Base
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  -- Foreign Keys
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (partner_id) REFERENCES business_partners(id),
  FOREIGN KEY (category_id) REFERENCES financial_categories(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

CREATE INDEX idx_accounts_payable_org ON accounts_payable(organization_id);
CREATE INDEX idx_accounts_payable_branch ON accounts_payable(branch_id);
CREATE INDEX idx_accounts_payable_partner ON accounts_payable(partner_id);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);

-- ============================================
-- CONTAS A RECEBER
-- ============================================

CREATE TABLE accounts_receivable (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  branch_id INT NOT NULL,
  
  -- Relacionamentos
  partner_id INT,
  category_id INT,
  bank_account_id INT,
  
  -- Dados do Título
  description NVARCHAR(MAX) NOT NULL,
  document_number NVARCHAR(100),
  
  -- Datas
  issue_date DATETIME2 NOT NULL,
  due_date DATETIME2 NOT NULL,
  receive_date DATETIME2,
  
  -- Valores
  amount DECIMAL(18,2) NOT NULL,
  amount_received DECIMAL(18,2) DEFAULT 0.00,
  discount DECIMAL(18,2) DEFAULT 0.00,
  interest DECIMAL(18,2) DEFAULT 0.00,
  fine DECIMAL(18,2) DEFAULT 0.00,
  
  -- Status e Origem
  status NVARCHAR(20) DEFAULT 'OPEN' NOT NULL, -- 'OPEN', 'RECEIVED', 'PARTIAL', 'OVERDUE', 'CANCELED'
  origin NVARCHAR(50) DEFAULT 'MANUAL', -- 'MANUAL', 'FISCAL_NFE_SAIDA', 'SALE', 'IMPORT'
  
  -- Observações
  notes NVARCHAR(MAX),
  
  -- Enterprise Base
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1 NOT NULL,
  
  -- Foreign Keys
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id),
  FOREIGN KEY (partner_id) REFERENCES business_partners(id),
  FOREIGN KEY (category_id) REFERENCES financial_categories(id),
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id)
);

CREATE INDEX idx_accounts_receivable_org ON accounts_receivable(organization_id);
CREATE INDEX idx_accounts_receivable_branch ON accounts_receivable(branch_id);
CREATE INDEX idx_accounts_receivable_partner ON accounts_receivable(partner_id);
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(status);
CREATE INDEX idx_accounts_receivable_due_date ON accounts_receivable(due_date);


































