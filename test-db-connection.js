/**
 * Script de Teste de Conexão com SQL Server
 * Execução: node test-db-connection.js
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_NAME || 'aura_core',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
};

console.log('\n🔍 TESTANDO CONEXÃO COM SQL SERVER\n');
console.log('═'.repeat(60));
console.log('📊 Configurações (sem senha):');
console.log(`   Server: ${config.server}`);
console.log(`   Port: ${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   Encrypt: ${config.options.encrypt}`);
console.log(`   Trust Cert: ${config.options.trustServerCertificate}`);
console.log('═'.repeat(60));

async function testConnection() {
  let pool;
  
  try {
    console.log('\n⏳ Tentando conectar...\n');
    
    const startTime = Date.now();
    pool = await sql.connect(config);
    const endTime = Date.now();
    
    console.log(`✅ CONEXÃO ESTABELECIDA COM SUCESSO!`);
    console.log(`   Tempo: ${endTime - startTime}ms\n`);
    
    // Testar query simples
    console.log('⏳ Testando query SELECT...\n');
    const result = await pool.request().query('SELECT @@VERSION AS Version, DB_NAME() AS DatabaseName');
    
    console.log('✅ QUERY EXECUTADA COM SUCESSO!\n');
    console.log('📊 Informações do Servidor:');
    console.log(`   Database: ${result.recordset[0].DatabaseName}`);
    console.log(`   Version: ${result.recordset[0].Version.split('\n')[0]}\n`);
    
    // Testar acesso a tabelas principais
    console.log('⏳ Verificando tabelas principais...\n');
    const tables = await pool.request().query(`
      SELECT 
        TABLE_NAME,
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) as ColumnCount
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log(`✅ Tabelas encontradas: ${tables.recordset.length}\n`);
    
    // Mostrar algumas tabelas principais
    const mainTables = ['users', 'organizations', 'branches', 'nfe_invoices', 'cte', 'accounts_payable', 'accounts_receivable'];
    const foundTables = tables.recordset.filter(t => mainTables.includes(t.TABLE_NAME));
    
    if (foundTables.length > 0) {
      console.log('📋 Tabelas Principais:');
      foundTables.forEach(t => {
        console.log(`   - ${t.TABLE_NAME} (${t.ColumnCount} colunas)`);
      });
    } else {
      console.log('⚠️  Nenhuma tabela principal encontrada!');
      console.log('   Primeiras 10 tabelas:');
      tables.recordset.slice(0, 10).forEach(t => {
        console.log(`   - ${t.TABLE_NAME} (${t.ColumnCount} colunas)`);
      });
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log('🎊 TESTE COMPLETO - TUDO FUNCIONANDO!');
    console.log('═'.repeat(60) + '\n');
    
  } catch (err) {
    console.error('\n' + '═'.repeat(60));
    console.error('❌ ERRO DE CONEXÃO!');
    console.error('═'.repeat(60));
    console.error(`\n🔴 Tipo: ${err.name}`);
    console.error(`🔴 Código: ${err.code || 'N/A'}`);
    console.error(`🔴 Mensagem: ${err.message}\n`);
    
    // Diagnóstico detalhado
    console.error('🔍 DIAGNÓSTICO:');
    
    if (err.code === 'ESOCKET' || err.message.includes('Could not connect')) {
      console.error('   ⚠️  Servidor não está acessível!');
      console.error('   Possíveis causas:');
      console.error('   1. SQL Server está offline');
      console.error('   2. Firewall bloqueando porta 1433');
      console.error('   3. IP/Porta incorretos no .env');
      console.error('   4. Problemas de rede/VPN');
      console.error('');
      console.error('   ✅ Ações sugeridas:');
      console.error(`   - Verificar se servidor ${config.server} está online`);
      console.error(`   - Testar: ping ${config.server}`);
      console.error(`   - Testar porta: telnet ${config.server} ${config.port}`);
      console.error('   - Verificar se SQL Server está rodando no servidor');
      console.error('   - Verificar configurações de firewall');
    } else if (err.code === 'ELOGIN') {
      console.error('   ⚠️  Falha de autenticação!');
      console.error('   Possíveis causas:');
      console.error('   1. Usuário/senha incorretos');
      console.error('   2. Usuário não tem permissão no database');
      console.error('   3. Autenticação SQL Server desabilitada');
      console.error('');
      console.error('   ✅ Ações sugeridas:');
      console.error('   - Verificar DB_USER e DB_PASSWORD no .env');
      console.error('   - Verificar se autenticação SQL está habilitada');
      console.error('   - Verificar permissões do usuário no database');
    } else if (err.message.includes('database')) {
      console.error('   ⚠️  Database não existe ou não está acessível!');
      console.error('   Possíveis causas:');
      console.error('   1. Database não foi criado');
      console.error('   2. Nome incorreto no .env');
      console.error('   3. Usuário sem permissão no database');
      console.error('');
      console.error('   ✅ Ações sugeridas:');
      console.error('   - Verificar se database "' + config.database + '" existe');
      console.error('   - Verificar DB_NAME no .env');
      console.error('   - Criar database se necessário');
    } else {
      console.error('   ⚠️  Erro desconhecido!');
      console.error('   Erro completo:');
      console.error('   ' + JSON.stringify(err, null, 2));
    }
    
    console.error('\n' + '═'.repeat(60) + '\n');
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Executar teste
testConnection().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});

