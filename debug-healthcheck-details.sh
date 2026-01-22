#!/bin/bash
# Script para debugar detalhes do healthcheck falhando

CONTAINER=$(docker ps | grep zksk8s0kk08sksgwggkos0gw | head -1 | awk '{print $1}')

if [ -z "$CONTAINER" ]; then
  echo "❌ Container não encontrado!"
  exit 1
fi

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  DEBUG DETALHADO - HEALTHCHECK FALHANDO                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Container: $CONTAINER"
echo ""

# Chamar endpoint de health interno (se existir)
echo "=== 1. TESTAR ENDPOINT /api/health INTERNO ==="
docker exec $CONTAINER sh -c "command -v curl > /dev/null && curl -s http://localhost:3000/api/health 2>&1 | head -50 || echo 'curl não disponível'"
echo ""

# Buscar último healthcheck completo nos logs
echo "=== 2. ÚLTIMO HEALTHCHECK COMPLETO ==="
docker logs $CONTAINER 2>&1 | tail -500 | grep -A50 "ops.health.started" | tail -55
echo ""

# Buscar erros específicos
echo "=== 3. ERROS RECENTES (últimos 100 logs) ==="
docker logs $CONTAINER 2>&1 | tail -100 | grep -iE "(error|exception|failed)" | head -20
echo ""

# Verificar tabelas críticas
echo "=== 4. VERIFICAR TABELAS CRÍTICAS ==="
echo "Conectando ao SQL Server via Node.js..."

docker exec $CONTAINER node -e "
const { pool, ensureConnection } = require('./dist/lib/db/index.js');

(async () => {
  try {
    await ensureConnection();
    console.log('✅ Conexão com DB OK');
    
    // Verificar tabela idempotency_keys
    const r1 = await pool.request().query(\`
      SELECT CASE WHEN OBJECT_ID('dbo.idempotency_keys','U') IS NULL THEN 0 ELSE 1 END as exists
    \`);
    const exists = r1.recordset[0].exists === 1;
    console.log('Tabela idempotency_keys:', exists ? '✅ EXISTE' : '❌ NÃO EXISTE');
    
    if (!exists) {
      console.log('');
      console.log('⚠️  PROBLEMA ENCONTRADO: Tabela idempotency_keys não existe!');
      console.log('');
      console.log('SOLUÇÃO: Criar tabela manualmente ou rodar migrations.');
      console.log('');
      console.log('SQL para criar tabela:');
      console.log(\`
CREATE TABLE dbo.idempotency_keys (
  id INT IDENTITY(1,1) PRIMARY KEY,
  organization_id INT NOT NULL,
  scope VARCHAR(128) NOT NULL,
  key VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  result_ref VARCHAR(256),
  expires_at DATETIME2,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  CONSTRAINT UQ_idempotency UNIQUE (organization_id, scope, key)
);
      \`);
      process.exit(1);
    }
    
    // Verificar tabela organizations
    const r2 = await pool.request().query(\`
      SELECT TOP 1 id FROM dbo.organizations
    \`);
    const hasOrgs = r2.recordset && r2.recordset.length > 0;
    console.log('Tabela organizations:', hasOrgs ? '✅ TEM DADOS' : '⚠️  VAZIA');
    
    if (!hasOrgs) {
      console.log('');
      console.log('⚠️  Tabela organizations está vazia!');
      console.log('    Healthcheck pode falhar se precisar de organizationId.');
      console.log('');
      console.log('SOLUÇÃO: Rodar seed para popular dados iniciais.');
    }
    
    console.log('');
    console.log('✅ Verificação de tabelas concluída.');
    
  } catch (e) {
    console.error('❌ Erro:', e.message);
    process.exit(1);
  }
})();
" 2>&1
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  PRÓXIMOS PASSOS                                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Se tabela idempotency_keys NÃO existe:"
echo "  → Ver output acima para SQL de criação"
echo "  → OU rodar: docker exec \$CONTAINER npm run migrate"
echo ""
echo "Se tabela organizations está vazia:"
echo "  → Rodar seed de dados iniciais"
echo ""
echo "Se outro erro:"
echo "  → Verificar logs completos do healthcheck acima"
echo ""
