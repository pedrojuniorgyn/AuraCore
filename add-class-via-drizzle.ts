import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-mssql';
import mssql from 'mssql';
import 'dotenv/config';

async function addClassColumn() {
  console.log('🚀 Executando migration via Drizzle...\n');

  const config: mssql.config = {
    server: process.env.DB_SERVER!,
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  };

  console.log(`📍 Server: ${config.server}`);
  console.log(`📍 Database: ${config.database}`);
  console.log(`📍 User: ${config.user}\n`);

  let pool: mssql.ConnectionPool | null = null;

  try {
    pool = await mssql.connect(config);
    const db = drizzle(pool);

    console.log('✅ Conectado!\n');

    // Verificar se coluna existe
    console.log('🔍 Verificando coluna "class"...');
    
    const checkQuery = sql`
      SELECT COUNT(*) as count
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('cost_centers') 
      AND name = 'class'
    `;

    const checkResult = await db.execute(checkQuery);
    const exists = (checkResult as any)[0]?.count > 0;

    if (exists) {
      console.log('✅ Coluna "class" já existe!\n');
      return;
    }

    console.log('📝 Adicionando coluna...\n');

    // Adicionar coluna
    const alterQuery = sql`
      ALTER TABLE cost_centers
      ADD class NVARCHAR(20) DEFAULT 'BOTH'
    `;

    await db.execute(alterQuery);
    console.log('✅ Coluna adicionada!\n');

    // Atualizar registros
    const updateQuery = sql`
      UPDATE cost_centers
      SET class = 'BOTH'
      WHERE class IS NULL
    `;

    await db.execute(updateQuery);
    console.log('✅ Registros atualizados!\n');

    console.log('🎉 MIGRATION CONCLUÍDA COM SUCESSO!');

  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔒 Conexão fechada.');
    }
  }
}

addClassColumn()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
