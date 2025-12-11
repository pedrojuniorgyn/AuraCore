-- ============================================================================
-- FIX: Adicionar coluna is_active na fiscal_tax_matrix se não existir
-- ============================================================================

-- Verificar se a coluna is_active existe, se não, adicionar
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'fiscal_tax_matrix') 
    AND name = 'is_active'
)
BEGIN
    ALTER TABLE fiscal_tax_matrix 
    ADD is_active BIT DEFAULT 1;
    
    PRINT 'Coluna is_active adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Coluna is_active já existe.';
END;

-- Garantir que todos os registros existentes tenham is_active = 1
UPDATE fiscal_tax_matrix 
SET is_active = 1 
WHERE is_active IS NULL;

PRINT 'Migration 0030 executada com sucesso!';





