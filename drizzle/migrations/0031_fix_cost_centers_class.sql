-- ============================================================================
-- FIX: Adicionar coluna class na financial_cost_centers se não existir
-- ============================================================================

-- Verificar se a coluna class existe, se não, adicionar
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'financial_cost_centers') 
    AND name = 'class'
)
BEGIN
    ALTER TABLE financial_cost_centers 
    ADD class VARCHAR(20) DEFAULT 'BOTH';
    
    PRINT 'Coluna class adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Coluna class já existe.';
END;

-- Garantir que todos os registros existentes tenham class = 'BOTH'
UPDATE financial_cost_centers 
SET class = 'BOTH' 
WHERE class IS NULL;

PRINT 'Migration 0031 executada com sucesso!';














