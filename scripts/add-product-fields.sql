-- Adiciona campos fiscais na tabela products
-- Execute este script manualmente no SQL Server

-- Verifica se a coluna 'ncm' já existe antes de adicionar
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND name = 'ncm')
BEGIN
    ALTER TABLE [products] ADD [ncm] nvarchar(8) NOT NULL CONSTRAINT [products_ncm_default] DEFAULT ('00000000');
    PRINT 'Coluna ncm adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Coluna ncm já existe.';
END;
GO

-- Verifica se a coluna 'origin' já existe antes de adicionar
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND name = 'origin')
BEGIN
    ALTER TABLE [products] ADD [origin] nvarchar(1) NOT NULL CONSTRAINT [products_origin_default] DEFAULT ('0');
    PRINT 'Coluna origin adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Coluna origin já existe.';
END;
GO

-- Verifica se a coluna 'weight_kg' já existe antes de adicionar
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND name = 'weight_kg')
BEGIN
    ALTER TABLE [products] ADD [weight_kg] decimal(10,3);
    PRINT 'Coluna weight_kg adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Coluna weight_kg já existe.';
END;
GO

-- Verifica se a coluna 'price_cost' já existe antes de adicionar
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND name = 'price_cost')
BEGIN
    ALTER TABLE [products] ADD [price_cost] decimal(18,2);
    PRINT 'Coluna price_cost adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Coluna price_cost já existe.';
END;
GO

-- Verifica se a coluna 'price_sale' já existe antes de adicionar
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[products]') AND name = 'price_sale')
BEGIN
    ALTER TABLE [products] ADD [price_sale] decimal(18,2);
    PRINT 'Coluna price_sale adicionada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Coluna price_sale já existe.';
END;
GO

PRINT 'Script concluído! Todos os campos foram adicionados.';


























