import sql from 'mssql';
import * as fs from 'fs';
import * as path from 'path';

const config: sql.config = {
  user: process.env.DB_USER || 'auracore',
  password: process.env.DB_PASSWORD || 'C0r3@2024!Secure',
  server: process.env.DB_SERVER || 'vpsw4722.publiccloud.com.br',
  database: process.env.DB_NAME || 'aura_core',
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function runMigration() {
  console.log('🚀 Executando migration 0032...\n');

  try {
    const pool = await sql.connect(config);
    console.log('✅ Conectado ao banco de dados\n');

    const migrationPath = path.join(__dirname, 'drizzle', 'migrations', '0032_add_class_to_cost_centers.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executando SQL...\n');
    
    const result = await pool.request().query(migrationSQL);
    
    console.log('\n✅ Migration executada com sucesso!');
    console.log('📊 Resultado:', result);

    await pool.close();
    console.log('\n✅ Conexão fechada');
  } catch (error) {
    console.error('\n❌ Erro ao executar migration:', error);
    process.exit(1);
  }
}

runMigration();
