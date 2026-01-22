-- SQL para criar tabela idempotency_keys
-- Executar: docker exec <container> node -e "..." < este arquivo

-- Verificar e criar tabela
IF NOT EXISTS (
    SELECT 1 FROM sys.tables t WHERE t.object_id = OBJECT_ID('dbo.idempotency_keys')
)
BEGIN
    CREATE TABLE dbo.idempotency_keys (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        organization_id INT NOT NULL,
        scope NVARCHAR(255) NOT NULL,
        idem_key NVARCHAR(128) NOT NULL,
        result_ref NVARCHAR(255) NULL,
        status NVARCHAR(16) NOT NULL CONSTRAINT DF_idempotency_status DEFAULT('IN_PROGRESS'),
        last_error NVARCHAR(4000) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_idempotency_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_idempotency_updated_at DEFAULT SYSUTCDATETIME(),
        expires_at DATETIME2 NULL
    );
    PRINT 'Tabela dbo.idempotency_keys criada com sucesso!';
END
ELSE
BEGIN
    PRINT 'Tabela dbo.idempotency_keys já existe.';
END;

-- Criar índice único
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.idempotency_keys')
      AND name = 'UX_idempotency_keys_org_scope_key'
)
BEGIN
    CREATE UNIQUE INDEX UX_idempotency_keys_org_scope_key
    ON dbo.idempotency_keys (organization_id, scope, idem_key);
    PRINT 'Índice único UX_idempotency_keys_org_scope_key criado com sucesso!';
END
ELSE
BEGIN
    PRINT 'Índice único UX_idempotency_keys_org_scope_key já existe.';
END;

SELECT 'Migration 0033 executada!' as resultado;
