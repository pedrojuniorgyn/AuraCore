import sql from 'mssql';
import 'dotenv/config';

async function addClassColumn() {
  console.log('🚀 Executando migration no banco de dados...\n');

  const config: sql.config = {
    user: 'aura_core',
    password: 'Tcl@04058#',
    server: 'vpsw4722.publiccloud.com.br', // Usar hostname em vez de IP
    database: 'aura_core',
    port: 1433,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };

  console.log(`📍 Server: ${config.server}:${config.port}`);
  console.log(`📍 Database: ${config.database}`);
  console.log(`📍 User: ${config.user}\n`);

  let pool: sql.ConnectionPool | null = null;

  try {
    console.log('🔌 Conectando...');
    pool = await sql.connect(config);
    console.log('✅ Conectado com sucesso!\n');

    // Verificar se coluna existe
    console.log('🔍 Verificando se coluna "class" existe...');
    
    const checkResult = await pool.request().query(`
      SELECT COUNT(*) as count
      FROM sys.columns 
      WHERE object_id = OBJECT_ID('cost_centers') 
      AND name = 'class'
    `);

    const columnExists = checkResult.recordset[0].count > 0;

    if (columnExists) {
      console.log('ℹ️  Coluna "class" JÁ EXISTE na tabela cost_centers!\n');
      
      // Mostrar definição da coluna
      const defResult = await pool.request().query(`
        SELECT 
          c.name as column_name,
          t.name as data_type,
          c.max_length,
          c.is_nullable
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID('cost_centers')
        AND c.name = 'class'
      `);
      
      console.log('📊 Definição atual:', defResult.recordset[0]);
      console.log('\n✅ Nenhuma ação necessária!');
      return;
    }

    console.log('📝 Coluna não existe. Adicionando agora...\n');

    // Adicionar coluna
    console.log('⚙️  Executando: ALTER TABLE cost_centers ADD class...');
    await pool.request().query(`
      ALTER TABLE cost_centers
      ADD class NVARCHAR(20) DEFAULT 'BOTH'
    `);

    console.log('✅ Coluna "class" adicionada com sucesso!\n');

    // Atualizar registros existentes
    console.log('⚙️  Atualizando registros existentes...');
    const updateResult = await pool.request().query(`
      UPDATE cost_centers
      SET class = 'BOTH'
      WHERE class IS NULL
    `);

    const rowsAffected = updateResult.rowsAffected[0] || 0;
    console.log(`✅ ${rowsAffected} registro(s) atualizado(s) com class='BOTH'\n`);

    // Verificar resultado final
    console.log('🔍 Verificando coluna criada...');
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

    console.log('📊 Coluna criada:', verifyResult.recordset[0]);
    console.log('\n🎉 MIGRATION EXECUTADA COM SUCESSO!');
    console.log('✅ Coluna "class" está pronta para uso!\n');

  } catch (error: any) {
    console.error('\n❌ ERRO ao executar migration:');
    console.error('📋 Mensagem:', error.message);
    if (error.code) {
      console.error('🔢 Código:', error.code);
    }
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔒 Conexão fechada.\n');
    }
  }
}

// Executar
console.log('═══════════════════════════════════════');
console.log('  MIGRATION: Adicionar coluna "class"');
console.log('  Tabela: cost_centers');
console.log('═══════════════════════════════════════\n');

addClassColumn()
  .then(() => {
    console.log('═══════════════════════════════════════');
    console.log('  ✅ CONCLUÍDO COM SUCESSO!');
    console.log('═══════════════════════════════════════\n');
    process.exit(0);
  })
  .catch((error) => {
    console.log('\n═══════════════════════════════════════');
    console.log('  ❌ FALHA NA EXECUÇÃO');
    console.log('═══════════════════════════════════════\n');
    process.exit(1);
  });
