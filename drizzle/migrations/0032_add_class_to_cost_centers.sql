-- Migration: Adicionar coluna 'class' na tabela cost_centers
-- Data: 2025-12-10
-- Descrição: Adiciona classificação de receita/despesa aos centros de custo

-- Adicionar coluna class
IF NOT EXISTS (
    SELECT 1 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('cost_centers') 
    AND name = 'class'
)
BEGIN
    ALTER TABLE cost_centers
    ADD class NVARCHAR(20) DEFAULT 'BOTH';
    
    PRINT 'Coluna class adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Coluna class já existe.';
END;
GO

-- Atualizar registros existentes (se houver)
UPDATE cost_centers
SET class = 'BOTH'
WHERE class IS NULL;
GO

PRINT 'Migration 0032 executada com sucesso!';
GO




















