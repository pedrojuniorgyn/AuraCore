#!/bin/bash
# ==============================================================================
# Script: Aplicar Hotfix BUG-022 (who_type + who_partner_id)
# Data: 02/02/2026
# Autor: AgenteAura
# Urgência: P0 - BLOQUEANTE
# ==============================================================================

set -e

echo "========================================="
echo "🚨 HOTFIX BUG-022: who_type + who_partner_id"
echo "========================================="
echo ""

# Configuração
SERVER_IP="5.253.85.46"
SERVER_USER="root"
MIGRATION_FILE="drizzle/migrations/0058_hotfix_add_who_type.sql"

# Verificar se arquivo de migration existe
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Erro: Arquivo de migration não encontrado: $MIGRATION_FILE"
  exit 1
fi

echo "📁 Migration encontrada: $MIGRATION_FILE"
echo ""

# Conectar ao servidor
echo "🔗 Conectando ao servidor $SERVER_IP..."
ssh -o ConnectTimeout=10 $SERVER_USER@$SERVER_IP << 'ENDSSH'

# Identificar container
WEB_CONTAINER=$(docker ps --format '{{.Names}}' | grep "^web-")
if [ -z "$WEB_CONTAINER" ]; then
  echo "❌ Erro: Container web não encontrado"
  exit 1
fi

echo "📦 Container identificado: $WEB_CONTAINER"
echo ""

# Aplicar migration via Node.js
echo "⚙️  Aplicando migration..."
echo ""

docker exec -i $WEB_CONTAINER node << 'NODESCRIPT'
const mssql = require('mssql');
const config = {
  server: process.env.DB_HOST || 'sql',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'AuraCore',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false'
  }
};

const sqlScript = `
-- 1. Adicionar who_type (CRÍTICO)
IF NOT EXISTS (SELECT 1 FROM sys.columns 
               WHERE object_id = OBJECT_ID('strategic_action_plan') 
               AND name = 'who_type')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_type] VARCHAR(20) NOT NULL DEFAULT 'USER';
    PRINT '✅ Coluna who_type adicionada';
END
ELSE
BEGIN
    PRINT '⚠️ Coluna who_type já existe';
END

-- 2. Adicionar who_partner_id
IF NOT EXISTS (SELECT 1 FROM sys.columns 
               WHERE object_id = OBJECT_ID('strategic_action_plan') 
               AND name = 'who_partner_id')
BEGIN
    ALTER TABLE [strategic_action_plan]
    ADD [who_partner_id] VARCHAR(36) NULL;
    PRINT '✅ Coluna who_partner_id adicionada';
END
ELSE
BEGIN
    PRINT '⚠️ Coluna who_partner_id já existe';
END

-- 3. Alterar who_user_id para NULL
IF EXISTS (SELECT 1 FROM sys.columns 
           WHERE object_id = OBJECT_ID('strategic_action_plan') 
           AND name = 'who_user_id' 
           AND is_nullable = 0)
BEGIN
    ALTER TABLE [strategic_action_plan]
    ALTER COLUMN [who_user_id] VARCHAR(36) NULL;
    PRINT '✅ Coluna who_user_id agora permite NULL';
END

-- 4. Criar índice who_type
IF NOT EXISTS (SELECT 1 FROM sys.indexes 
               WHERE name = 'idx_action_plan_who_type' 
               AND object_id = OBJECT_ID('strategic_action_plan'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_action_plan_who_type
    ON [strategic_action_plan](who_type)
    WHERE who_type IS NOT NULL AND deleted_at IS NULL;
    PRINT '✅ Índice idx_action_plan_who_type criado';
END

-- 5. Criar índice who_partner_id
IF NOT EXISTS (SELECT 1 FROM sys.indexes 
               WHERE name = 'idx_action_plan_who_partner' 
               AND object_id = OBJECT_ID('strategic_action_plan'))
BEGIN
    CREATE NONCLUSTERED INDEX idx_action_plan_who_partner
    ON [strategic_action_plan](who_partner_id)
    WHERE who_partner_id IS NOT NULL AND deleted_at IS NULL;
    PRINT '✅ Índice idx_action_plan_who_partner criado';
END
`;

(async () => {
  console.log('📦 Conectando ao banco...');
  const pool = await mssql.connect(config);
  console.log('✅ Conectado!\n');
  
  // Executar cada statement separadamente
  const statements = sqlScript.split(';').filter(s => s.trim());
  
  for (const stmt of statements) {
    if (stmt.trim()) {
      try {
        await pool.request().query(stmt);
      } catch (err) {
        console.error('⚠️ Warning:', err.message);
      }
    }
  }
  
  // Validação
  console.log('\n🔍 Validando aplicação...');
  const result = await pool.request().query(`
    SELECT 
      COLUMN_NAME,
      DATA_TYPE,
      CHARACTER_MAXIMUM_LENGTH,
      CASE WHEN IS_NULLABLE = 'YES' THEN 'NULL' ELSE 'NOT NULL' END AS nullable
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'strategic_action_plan'
    AND COLUMN_NAME IN ('who_type', 'who_partner_id', 'who_email', 'who_user_id')
    ORDER BY ORDINAL_POSITION
  `);
  
  console.log('\n✅ Estrutura atual dos campos "who*":');
  result.recordset.forEach(col => {
    console.log(`  - ${col.COLUMN_NAME.padEnd(20)} ${col.DATA_TYPE.padEnd(10)} ${col.CHARACTER_MAXIMUM_LENGTH || ''} ${col.nullable}`);
  });
  
  await pool.close();
  console.log('\n🎉 HOTFIX BUG-022 APLICADO COM SUCESSO!');
})().catch(err => {
  console.error('❌ ERRO:', err);
  process.exit(1);
});
NODESCRIPT

ENDSSH

echo ""
echo "========================================="
echo "✅ Hotfix aplicado no servidor!"
echo "========================================="
echo ""
echo "🧪 PRÓXIMOS PASSOS:"
echo ""
echo "1. Testar Dashboard:"
echo "   https://tcl.auracore.cloud/strategic/dashboard"
echo ""
echo "2. Testar APIs críticas:"
echo "   curl https://tcl.auracore.cloud/api/strategic/dashboard/data | jq ."
echo "   curl https://tcl.auracore.cloud/api/strategic/action-plans/kanban | jq ."
echo ""
echo "3. Validar ausência de erro 'Invalid column name who_type'"
echo ""
echo "========================================="
