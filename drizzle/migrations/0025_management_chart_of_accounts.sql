-- ==========================================
-- MIGRATION 0025: PLANO DE CONTAS GERENCIAL (PCG)
-- ==========================================
-- Implementa estrutura DUAL: PCC (Fiscal) + PCG (Gerencial)
-- Permite DRE Gerencial ≠ DRE Contábil
-- Data: 10/12/2024
-- ==========================================

-- ✅ 1. Tabela de Plano de Contas Gerencial
CREATE TABLE management_chart_of_accounts (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  
  -- Identificação
  code NVARCHAR(50) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX),
  
  -- Classificação
  type NVARCHAR(20) NOT NULL, -- REVENUE, COST, EXPENSE, ASSET, LIABILITY
  category NVARCHAR(100),
  
  -- Hierarquia
  parent_id BIGINT, -- FK self
  level INT DEFAULT 0,
  is_analytical BIT DEFAULT 0,
  
  -- Link com PCC (Plano Contábil Fiscal)
  legal_account_id BIGINT, -- FK para chart_of_accounts (PCC)
  
  -- Regras de Rateio/Alocação
  allocation_rule NVARCHAR(50), -- KM_DRIVEN, REVENUE_BASED, FIXED, MANUAL
  allocation_base NVARCHAR(50), -- TOTAL_KM, GROSS_REVENUE, HEADCOUNT
  
  -- Controle
  status NVARCHAR(20) DEFAULT 'ACTIVE',
  
  -- Auditoria
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  version INT DEFAULT 1,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (parent_id) REFERENCES management_chart_of_accounts(id),
  FOREIGN KEY (legal_account_id) REFERENCES chart_of_accounts(id)
);

CREATE INDEX idx_mgmt_chart_org ON management_chart_of_accounts(organization_id);
CREATE INDEX idx_mgmt_chart_parent ON management_chart_of_accounts(parent_id);
CREATE INDEX idx_mgmt_chart_legal ON management_chart_of_accounts(legal_account_id);
CREATE UNIQUE INDEX idx_mgmt_chart_code_org ON management_chart_of_accounts(organization_id, code) WHERE deleted_at IS NULL;

PRINT '✅ Tabela management_chart_of_accounts criada';
GO

-- ✅ 2. Tabela de Mapeamento PCC ↔ PCG
CREATE TABLE account_mapping (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  
  -- Relacionamento
  legal_account_id BIGINT NOT NULL, -- PCC
  management_account_id BIGINT NOT NULL, -- PCG
  
  -- Direção de Sincronização
  sync_direction NVARCHAR(20) NOT NULL DEFAULT 'ONE_WAY',
  -- ONE_WAY (PCC → PCG), TWO_WAY (PCC ↔ PCG), MANUAL (sem sync)
  
  -- Transformação
  transformation_rule NVARCHAR(MAX), -- JSON com regras de conversão
  -- Ex: { "multiply": 1.0, "add": 0, "provision_rate": 0.10 }
  
  -- Controle
  is_active BIT DEFAULT 1,
  created_at DATETIME2 DEFAULT GETDATE(),
  created_by NVARCHAR(255) NOT NULL,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (legal_account_id) REFERENCES chart_of_accounts(id),
  FOREIGN KEY (management_account_id) REFERENCES management_chart_of_accounts(id)
);

CREATE INDEX idx_mapping_legal ON account_mapping(legal_account_id);
CREATE INDEX idx_mapping_mgmt ON account_mapping(management_account_id);
CREATE UNIQUE INDEX idx_mapping_unique ON account_mapping(legal_account_id, management_account_id) WHERE is_active = 1;

PRINT '✅ Tabela account_mapping criada';
GO

-- ✅ 3. Tabela de Lançamentos Gerenciais
CREATE TABLE management_journal_entries (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  branch_id BIGINT NOT NULL,
  
  -- Identificação
  entry_number NVARCHAR(20) NOT NULL,
  entry_date DATETIME2 NOT NULL,
  
  -- Origem
  source_type NVARCHAR(30) NOT NULL, -- PROVISION, ALLOCATION, ADJUSTMENT
  source_id BIGINT,
  linked_legal_entry_id BIGINT, -- FK para journal_entries (PCC)
  
  -- Descrição
  description NVARCHAR(500) NOT NULL,
  notes NVARCHAR(MAX),
  
  -- Valores
  total_debit DECIMAL(18,2) NOT NULL,
  total_credit DECIMAL(18,2) NOT NULL,
  
  -- Status
  status NVARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, POSTED, REVERSED
  
  -- Auditoria
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  deleted_at DATETIME2,
  created_by NVARCHAR(255) NOT NULL,
  updated_by NVARCHAR(255),
  version INT DEFAULT 1,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (linked_legal_entry_id) REFERENCES journal_entries(id)
);

CREATE INDEX idx_mgmt_entry_org ON management_journal_entries(organization_id);
CREATE INDEX idx_mgmt_entry_date ON management_journal_entries(entry_date DESC);
CREATE INDEX idx_mgmt_entry_legal ON management_journal_entries(linked_legal_entry_id);

PRINT '✅ Tabela management_journal_entries criada';
GO

-- ✅ 4. Tabela de Linhas de Lançamentos Gerenciais
CREATE TABLE management_journal_entry_lines (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  management_journal_entry_id BIGINT NOT NULL,
  organization_id BIGINT NOT NULL,
  
  -- Linha
  line_number INT NOT NULL,
  
  -- Conta Gerencial
  management_account_id BIGINT NOT NULL,
  
  -- Valores
  debit_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  credit_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  
  -- Dimensões
  cost_center_id BIGINT, -- FK para financial_cost_centers
  category_id BIGINT,
  partner_id BIGINT,
  
  -- Descrição
  description NVARCHAR(500),
  notes NVARCHAR(MAX),
  
  -- Auditoria
  created_at DATETIME2 DEFAULT GETDATE(),
  updated_at DATETIME2 DEFAULT GETDATE(),
  version INT DEFAULT 1,
  
  FOREIGN KEY (management_journal_entry_id) REFERENCES management_journal_entries(id),
  FOREIGN KEY (management_account_id) REFERENCES management_chart_of_accounts(id),
  FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id)
);

CREATE INDEX idx_mgmt_line_entry ON management_journal_entry_lines(management_journal_entry_id);
CREATE INDEX idx_mgmt_line_account ON management_journal_entry_lines(management_account_id);
CREATE INDEX idx_mgmt_line_cc ON management_journal_entry_lines(cost_center_id);

PRINT '✅ Tabela management_journal_entry_lines criada';
GO

-- ✅ 5. Seed Inicial de Contas Gerenciais (Espelho do PCC)
-- Cria contas gerenciais básicas espelhando as mais importantes do PCC
INSERT INTO management_chart_of_accounts (organization_id, code, name, type, is_analytical, allocation_rule, status, created_by, updated_by)
VALUES
-- Custos Variáveis (Alocação Direta)
(1, 'G-4.1.1.01.001', 'Custo Gerencial - Diesel (Provisão por KM)', 'COST', 1, 'KM_DRIVEN', 'ACTIVE', 'system', 'system'),
(1, 'G-4.1.1.02.001', 'Custo Gerencial - Pneus (Provisão por KM)', 'COST', 1, 'KM_DRIVEN', 'ACTIVE', 'system', 'system'),
(1, 'G-4.1.2.01.001', 'Custo Gerencial - Frete Subcontratado', 'COST', 1, 'MANUAL', 'ACTIVE', 'system', 'system'),

-- Custos Fixos (Rateio por Receita)
(1, 'G-4.2.1.01.001', 'Despesa Gerencial - Salários Rateados', 'EXPENSE', 1, 'REVENUE_BASED', 'ACTIVE', 'system', 'system'),
(1, 'G-4.2.4.01.001', 'Despesa Gerencial - Depreciação Alocada', 'EXPENSE', 1, 'KM_DRIVEN', 'ACTIVE', 'system', 'system');

PRINT '✅ Seed inicial de contas gerenciais criado';
GO

-- ==========================================
-- RESUMO DA MIGRATION 0025
-- ==========================================
PRINT '';
PRINT '📊 MIGRATION 0025 CONCLUÍDA';
PRINT '';
PRINT '✅ Plano de Contas Dual (PCC + PCG) implementado';
PRINT '✅ Tabela: management_chart_of_accounts';
PRINT '✅ Tabela: account_mapping (PCC ↔ PCG)';
PRINT '✅ Tabela: management_journal_entries';
PRINT '✅ Tabela: management_journal_entry_lines';
PRINT '✅ Seed: 5 contas gerenciais básicas';
PRINT '';
GO























