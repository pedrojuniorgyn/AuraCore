-- ==========================================
-- MIGRATION 0021: INTEGRAÇÃO CENTROS DE CUSTO
-- ==========================================
-- Adiciona cost_center_id em lançamentos contábeis e itens fiscais
-- Data: 2024-12-10
-- Objetivo: Permitir rastreabilidade de custos por Centro de Custo
-- ==========================================

-- ✅ 1. Adicionar cost_center_id em journal_entry_lines
IF NOT EXISTS (
  SELECT 1 FROM sys.columns 
  WHERE object_id = OBJECT_ID('journal_entry_lines') 
    AND name = 'cost_center_id'
)
BEGIN
  ALTER TABLE journal_entry_lines
  ADD cost_center_id INT NULL;

  PRINT '✅ Coluna cost_center_id adicionada em journal_entry_lines';
END
ELSE
BEGIN
  PRINT 'ℹ️  Coluna cost_center_id já existe em journal_entry_lines';
END
GO

-- ✅ 2. Adicionar FK para financial_cost_centers
IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys 
  WHERE name = 'FK_journal_entry_lines_cost_center'
)
BEGIN
  ALTER TABLE journal_entry_lines
  ADD CONSTRAINT FK_journal_entry_lines_cost_center
  FOREIGN KEY (cost_center_id) 
  REFERENCES financial_cost_centers(id);

  PRINT '✅ FK cost_center_id adicionada em journal_entry_lines';
END
ELSE
BEGIN
  PRINT 'ℹ️  FK cost_center_id já existe em journal_entry_lines';
END
GO

-- ✅ 3. Adicionar índice para performance
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes 
  WHERE name = 'idx_journal_entry_lines_cost_center'
)
BEGIN
  CREATE INDEX idx_journal_entry_lines_cost_center 
  ON journal_entry_lines(cost_center_id);

  PRINT '✅ Índice idx_journal_entry_lines_cost_center criado';
END
ELSE
BEGIN
  PRINT 'ℹ️  Índice idx_journal_entry_lines_cost_center já existe';
END
GO

-- ✅ 4. Adicionar cost_center_id em fiscal_document_items
IF NOT EXISTS (
  SELECT 1 FROM sys.columns 
  WHERE object_id = OBJECT_ID('fiscal_document_items') 
    AND name = 'cost_center_id'
)
BEGIN
  ALTER TABLE fiscal_document_items
  ADD cost_center_id INT NULL;

  PRINT '✅ Coluna cost_center_id adicionada em fiscal_document_items';
END
ELSE
BEGIN
  PRINT 'ℹ️  Coluna cost_center_id já existe em fiscal_document_items';
END
GO

-- ✅ 5. Adicionar FK para financial_cost_centers
IF NOT EXISTS (
  SELECT 1 FROM sys.foreign_keys 
  WHERE name = 'FK_fiscal_document_items_cost_center'
)
BEGIN
  ALTER TABLE fiscal_document_items
  ADD CONSTRAINT FK_fiscal_document_items_cost_center
  FOREIGN KEY (cost_center_id) 
  REFERENCES financial_cost_centers(id);

  PRINT '✅ FK cost_center_id adicionada em fiscal_document_items';
END
ELSE
BEGIN
  PRINT 'ℹ️  FK cost_center_id já existe em fiscal_document_items';
END
GO

-- ✅ 6. Adicionar índice para performance
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes 
  WHERE name = 'idx_fiscal_document_items_cost_center'
)
BEGIN
  CREATE INDEX idx_fiscal_document_items_cost_center 
  ON fiscal_document_items(cost_center_id);

  PRINT '✅ Índice idx_fiscal_document_items_cost_center criado';
END
ELSE
BEGIN
  PRINT 'ℹ️  Índice idx_fiscal_document_items_cost_center já existe';
END
GO

-- ==========================================
-- RESUMO DA MIGRATION
-- ==========================================
PRINT '';
PRINT '📊 MIGRATION 0021 CONCLUÍDA';
PRINT '';
PRINT '✅ Adicionado: journal_entry_lines.cost_center_id';
PRINT '✅ Adicionado: fiscal_document_items.cost_center_id';
PRINT '✅ Adicionadas: Foreign Keys';
PRINT '✅ Adicionados: Índices de performance';
PRINT '';
PRINT '🎯 PRÓXIMOS PASSOS:';
PRINT '   1. Atualizar schema Drizzle';
PRINT '   2. Atualizar tela de edição de documento fiscal';
PRINT '   3. Adicionar SearchableSelect para Centros de Custo';
PRINT '';
GO













