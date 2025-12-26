-- ==========================================
-- MIGRATION 0022: MELHORIAS AVANÇADAS
-- ==========================================
-- 1. Função de códigos significativos
-- 2. Auditoria detalhada
-- 3. Rateio Multi-CC
-- 4. Classe em Centros de Custo
-- Data: 2024-12-10
-- ==========================================

-- ✅ 1. FUNÇÃO: Próximo Código Significativo
-- ==========================================
IF OBJECT_ID('dbo.fn_next_chart_account_code', 'FN') IS NOT NULL
  DROP FUNCTION dbo.fn_next_chart_account_code;
GO

CREATE FUNCTION dbo.fn_next_chart_account_code(@parent_id INT)
RETURNS NVARCHAR(50)
AS
BEGIN
  DECLARE @parent_code NVARCHAR(50);
  DECLARE @max_child_code NVARCHAR(50);
  DECLARE @next_code NVARCHAR(50);
  
  -- Se não tem pai, é nível 0
  IF @parent_id IS NULL
  BEGIN
    SELECT @max_child_code = MAX(code) 
    FROM chart_of_accounts 
    WHERE parent_id IS NULL 
      AND deleted_at IS NULL
      AND code NOT LIKE '%.%';
    
    IF @max_child_code IS NULL
      SET @next_code = '1';
    ELSE
      SET @next_code = CAST(CAST(@max_child_code AS INT) + 1 AS NVARCHAR(50));
    
    RETURN @next_code;
  END
  
  -- Buscar código do pai
  SELECT @parent_code = code 
  FROM chart_of_accounts 
  WHERE id = @parent_id;
  
  -- Buscar último código filho
  SELECT @max_child_code = MAX(code) 
  FROM chart_of_accounts 
  WHERE parent_id = @parent_id 
    AND deleted_at IS NULL;
  
  IF @max_child_code IS NULL
  BEGIN
    -- Primeiro filho
    SET @next_code = @parent_code + '.01';
  END
  ELSE
  BEGIN
    -- Extrair última parte e incrementar
    DECLARE @last_part NVARCHAR(10);
    DECLARE @last_num INT;
    
    SET @last_part = REVERSE(LEFT(REVERSE(@max_child_code), CHARINDEX('.', REVERSE(@max_child_code)) - 1));
    SET @last_num = CAST(@last_part AS INT) + 1;
    SET @next_code = @parent_code + '.' + FORMAT(@last_num, '00');
  END
  
  RETURN @next_code;
END;
GO

PRINT '✅ Função fn_next_chart_account_code criada';
GO

-- ✅ 2. AUDITORIA DETALHADA: Chart of Accounts
-- ==========================================
IF OBJECT_ID('chart_accounts_audit', 'U') IS NULL
BEGIN
  CREATE TABLE chart_accounts_audit (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    chart_account_id INT NOT NULL,
    operation NVARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    
    -- Snapshot ANTES
    old_code NVARCHAR(50),
    old_name NVARCHAR(255),
    old_type NVARCHAR(50),
    old_status NVARCHAR(20),
    old_category NVARCHAR(100),
    
    -- Snapshot DEPOIS
    new_code NVARCHAR(50),
    new_name NVARCHAR(255),
    new_type NVARCHAR(50),
    new_status NVARCHAR(20),
    new_category NVARCHAR(100),
    
    -- Metadados
    changed_by NVARCHAR(255) NOT NULL,
    changed_at DATETIME2 DEFAULT GETDATE(),
    reason NVARCHAR(MAX),
    ip_address NVARCHAR(45),
    
    FOREIGN KEY (chart_account_id) REFERENCES chart_of_accounts(id)
  );
  
  CREATE INDEX idx_chart_accounts_audit_account ON chart_accounts_audit(chart_account_id);
  CREATE INDEX idx_chart_accounts_audit_date ON chart_accounts_audit(changed_at DESC);
  
  PRINT '✅ Tabela chart_accounts_audit criada';
END
ELSE
  PRINT 'ℹ️  Tabela chart_accounts_audit já existe';
GO

-- ✅ 3. AUDITORIA: Financial Categories
-- ==========================================
IF OBJECT_ID('financial_categories_audit', 'U') IS NULL
BEGIN
  CREATE TABLE financial_categories_audit (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    category_id INT NOT NULL,
    operation NVARCHAR(20) NOT NULL,
    
    old_name NVARCHAR(255),
    old_code NVARCHAR(50),
    old_type NVARCHAR(20),
    old_status NVARCHAR(20),
    
    new_name NVARCHAR(255),
    new_code NVARCHAR(50),
    new_type NVARCHAR(20),
    new_status NVARCHAR(20),
    
    changed_by NVARCHAR(255) NOT NULL,
    changed_at DATETIME2 DEFAULT GETDATE(),
    reason NVARCHAR(MAX)
  );
  
  CREATE INDEX idx_financial_categories_audit_category ON financial_categories_audit(category_id);
  
  PRINT '✅ Tabela financial_categories_audit criada';
END
ELSE
  PRINT 'ℹ️  Tabela financial_categories_audit já existe';
GO

-- ✅ 4. AUDITORIA: Cost Centers
-- ==========================================
IF OBJECT_ID('cost_centers_audit', 'U') IS NULL
BEGIN
  CREATE TABLE cost_centers_audit (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    cost_center_id INT NOT NULL,
    operation NVARCHAR(20) NOT NULL,
    
    old_code NVARCHAR(50),
    old_name NVARCHAR(255),
    old_type NVARCHAR(20),
    old_status NVARCHAR(20),
    
    new_code NVARCHAR(50),
    new_name NVARCHAR(255),
    new_type NVARCHAR(20),
    new_status NVARCHAR(20),
    
    changed_by NVARCHAR(255) NOT NULL,
    changed_at DATETIME2 DEFAULT GETDATE(),
    reason NVARCHAR(MAX)
  );
  
  CREATE INDEX idx_cost_centers_audit_cc ON cost_centers_audit(cost_center_id);
  
  PRINT '✅ Tabela cost_centers_audit criada';
END
ELSE
  PRINT 'ℹ️  Tabela cost_centers_audit já existe';
GO

-- ✅ 5. RATEIO MULTI-CC
-- ==========================================
IF OBJECT_ID('cost_center_allocations', 'U') IS NULL
BEGIN
  CREATE TABLE cost_center_allocations (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    journal_entry_line_id BIGINT NOT NULL,
    cost_center_id INT NOT NULL,
    percentage DECIMAL(5,2) NOT NULL, -- 0.00 a 100.00
    amount DECIMAL(18,2) NOT NULL,
    
    created_at DATETIME2 DEFAULT GETDATE(),
    created_by NVARCHAR(255) NOT NULL,
    
    FOREIGN KEY (journal_entry_line_id) REFERENCES journal_entry_lines(id),
    FOREIGN KEY (cost_center_id) REFERENCES financial_cost_centers(id),
    
    CONSTRAINT CK_allocation_percentage CHECK (percentage >= 0 AND percentage <= 100)
  );
  
  CREATE INDEX idx_cost_center_allocations_line ON cost_center_allocations(journal_entry_line_id);
  CREATE INDEX idx_cost_center_allocations_cc ON cost_center_allocations(cost_center_id);
  
  PRINT '✅ Tabela cost_center_allocations criada';
END
ELSE
  PRINT 'ℹ️  Tabela cost_center_allocations já existe';
GO

-- ✅ 6. CLASSE EM CENTROS DE CUSTO
-- ==========================================
IF NOT EXISTS (
  SELECT 1 FROM sys.columns 
  WHERE object_id = OBJECT_ID('financial_cost_centers') 
    AND name = 'class'
)
BEGIN
  ALTER TABLE financial_cost_centers
  ADD class NVARCHAR(20) DEFAULT 'BOTH';
  -- Valores: 'REVENUE', 'EXPENSE', 'BOTH'
  
  PRINT '✅ Coluna class adicionada em financial_cost_centers';
END
ELSE
  PRINT 'ℹ️  Coluna class já existe em financial_cost_centers';
GO

-- ==========================================
-- RESUMO DA MIGRATION 0022
-- ==========================================
PRINT '';
PRINT '📊 MIGRATION 0022 CONCLUÍDA';
PRINT '';
PRINT '✅ Função: fn_next_chart_account_code';
PRINT '✅ Auditoria: chart_accounts_audit';
PRINT '✅ Auditoria: financial_categories_audit';
PRINT '✅ Auditoria: cost_centers_audit';
PRINT '✅ Rateio: cost_center_allocations';
PRINT '✅ Classe: financial_cost_centers.class';
PRINT '';
GO


















