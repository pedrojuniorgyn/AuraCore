#!/bin/bash
# Script para criar tabela idempotency_keys via SQL direto

CONTAINER=$(docker ps | grep zksk8s0kk08sksgwggkos0gw | head -1 | awk '{print $1}')

if [ -z "$CONTAINER" ]; then
  echo "❌ Container não encontrado!"
  exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  CRIAR TABELA IDEMPOTENCY_KEYS                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Container: $CONTAINER"
echo ""

# SQL para criar tabela (da migration 0033)
SQL="
-- Verificar se tabela existe
IF NOT EXISTS (
    SELECT 1
    FROM sys.tables t
    WHERE t.object_id = OBJECT_ID('dbo.idempotency_keys')
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
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.idempotency_keys')
      AND name = 'UX_idempotency_keys_org_scope_key'
)
BEGIN
    CREATE UNIQUE INDEX UX_idempotency_keys_org_scope_key
    ON dbo.idempotency_keys (organization_id, scope, idem_key);
    PRINT 'Índice único criado com sucesso!';
END
ELSE
BEGIN
    PRINT 'Índice único já existe.';
END;

SELECT 1 as success;
"

echo "=== EXECUTANDO SQL NO CONTAINER ==="
echo ""

# Executar SQL via Node.js (mssql pool)
docker exec $CONTAINER node << 'NODEJS'
const mssql = require('mssql');

const config = {
  server: process.env.DB_HOST || 'sql',
  port: parseInt(process.env.DB_PORT || '1433'),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'AuraCore',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true' || true,
    enableArithAbort: true,
  },
  pool: {
    max: 1,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 15000,
  connectionTimeout: 15000,
};

const sql = `
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
    SELECT 'Tabela criada com sucesso!' as message;
END
ELSE
BEGIN
    SELECT 'Tabela já existe.' as message;
END;
`;

(async () => {
  let pool;
  try {
    pool = await mssql.connect(config);
    console.log('✅ Conectado ao SQL Server');
    
    const result = await pool.request().query(sql);
    console.log('✅', result.recordset[0].message);
    
    // Criar índice
    const indexSql = `
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.idempotency_keys')
      AND name = 'UX_idempotency_keys_org_scope_key'
)
BEGIN
    CREATE UNIQUE INDEX UX_idempotency_keys_org_scope_key
    ON dbo.idempotency_keys (organization_id, scope, idem_key);
    SELECT 'Índice criado com sucesso!' as message;
END
ELSE
BEGIN
    SELECT 'Índice já existe.' as message;
END;
    `;
    
    const result2 = await pool.request().query(indexSql);
    console.log('✅', result2.recordset[0].message);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
})();
NODEJS

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  VERIFICAÇÃO                                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Aguardar 5 segundos
sleep 5

# Verificar próximo healthcheck
echo "Aguardando próximo healthcheck (15 segundos)..."
sleep 15

echo ""
echo "=== RESULTADO DO HEALTHCHECK ==="
docker logs $CONTAINER 2>&1 | grep "ops.health.finished" | tail -1 | \
  grep -q "SUCCEEDED" && echo "✅ HEALTHCHECK PASSOU!" || echo "⚠️  Healthcheck ainda falhando (verificar logs)"

echo ""
