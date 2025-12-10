import sql from 'mssql';

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

async function addClassColumn() {
  console.log('🚀 Conectando ao banco de dados...\n');
  console.log(`📍 Server: ${config.server}`);
  console.log(`📍 Database: ${config.database}\n`);

  let pool: sql.ConnectionPool | null = null;

  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado com sucesso!\n');

    console.log('🔍 Verificando se a coluna "class" já existe...');
    
    const checkResult = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('cost_centers') 
      AND name = 'class'
    `);

    const columnExists = checkResult.recordset[0].count > 0;

    if (columnExists) {
      console.log('✅ Coluna "class" já existe na tabela cost_centers!\n');
      return;
    }

    console.log('📝 Coluna não existe. Adicionando agora...\n');

    // Adicionar coluna
    await pool.request().query(`
      ALTER TABLE cost_centers
      ADD class NVARCHAR(20) DEFAULT 'BOTH'
    `);

    console.log('✅ Coluna "class" adicionada com sucesso!\n');

    // Atualizar registros existentes
    const updateResult = await pool.request().query(`
      UPDATE cost_centers
      SET class = 'BOTH'
      WHERE class IS NULL
    `);

    console.log(`✅ ${updateResult.rowsAffected[0]} registros atualizados com class='BOTH'\n`);

    // Verificar novamente
    const verifyResult = await pool.request().query(`
      SELECT 
        c.name as column_name,
        t.name as data_type,
        c.max_length,
        c.is_nullable,
        dc.definition as default_value
      FROM sys.columns c
      JOIN sys.types t ON c.user_type_id = t.user_type_id
      LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
      WHERE c.object_id = OBJECT_ID('cost_centers')
      AND c.name = 'class'
    `);

    console.log('🔍 Verificação da coluna criada:');
    console.log(verifyResult.recordset[0]);

    console.log('\n✅ Migration executada com SUCESSO!');
    console.log('🎉 Coluna "class" está pronta para uso!\n');

  } catch (error: any) {
    console.error('\n❌ ERRO ao executar migration:', error.message);
    console.error('📋 Detalhes:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔒 Conexão fechada.\n');
    }
  }
}

// Executar
addClassColumn()
  .then(() => {
    console.log('✅ CONCLUÍDO COM SUCESSO!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ FALHA NA EXECUÇÃO:', error.message);
    process.exit(1);
  });
