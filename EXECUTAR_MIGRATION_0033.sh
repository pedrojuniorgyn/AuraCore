#!/bin/bash
# Script SIMPLES para executar migration 0033 (tabela idempotency_keys)

CONTAINER=$(docker ps | grep zksk8s0kk08sksgwggkos0gw | head -1 | awk '{print $1}')

if [ -z "$CONTAINER" ]; then
  echo "❌ Container não encontrado!"
  exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  EXECUTAR MIGRATION 0033 - Tabela idempotency_keys            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Container: $CONTAINER"
echo ""

echo "=== EXECUTANDO SQL VIA MSSQL POOL ==="
echo ""

# Criar arquivo temporário com Node.js script
cat > /tmp/create-idempotency.js << 'ENDJS'
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
    SELECT 'TABELA CRIADA' as status;
END
ELSE
BEGIN
    SELECT 'TABELA JA EXISTE' as status;
END;
`;

const indexSql = `
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.idempotency_keys')
      AND name = 'UX_idempotency_keys_org_scope_key'
)
BEGIN
    CREATE UNIQUE INDEX UX_idempotency_keys_org_scope_key
    ON dbo.idempotency_keys (organization_id, scope, idem_key);
    SELECT 'INDICE CRIADO' as status;
END
ELSE
BEGIN
    SELECT 'INDICE JA EXISTE' as status;
END;
`;

(async () => {
  let pool;
  try {
    pool = await mssql.connect(config);
    console.log('✅ Conectado ao SQL Server');
    
    const result1 = await pool.request().query(sql);
    console.log('✅ Tabela:', result1.recordset[0].status);
    
    const result2 = await pool.request().query(indexSql);
    console.log('✅ Índice:', result2.recordset[0].status);
    
    console.log('');
    console.log('✅ Migration 0033 executada com sucesso!');
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
})();
ENDJS

# Copiar para container e executar
docker cp /tmp/create-idempotency.js $CONTAINER:/tmp/create-idempotency.js
docker exec $CONTAINER node /tmp/create-idempotency.js

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  AGUARDANDO PRÓXIMO HEALTHCHECK                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

sleep 20

echo "=== RESULTADO DO HEALTHCHECK ==="
docker logs $CONTAINER 2>&1 | grep "ops.health.finished" | tail -1 | tee /tmp/health-result.txt

if grep -q '"status":"SUCCEEDED"' /tmp/health-result.txt; then
  echo ""
  echo "✅ ✅ ✅ HEALTHCHECK PASSOU! ✅ ✅ ✅"
else
  echo ""
  echo "⚠️  Healthcheck ainda falhando."
  echo "   Verificar logs detalhados do healthcheck."
fi

rm -f /tmp/create-idempotency.js /tmp/health-result.txt

echo ""
