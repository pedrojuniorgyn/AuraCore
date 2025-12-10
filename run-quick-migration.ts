import { db } from './src/lib/db/index';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

async function runMigration() {
  console.log('🚀 Executando migration 0031...\n');

  try {
    const migrationSQL = fs.readFileSync('./drizzle/migrations/0031_fix_cost_centers_class.sql', 'utf8');
    
    console.log('📝 SQL a executar:\n', migrationSQL);
    console.log('\n🔄 Executando...\n');
    
    await db.execute(sql.raw(migrationSQL));
    
    console.log('✅ Migration executada com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

runMigration().then(() => {
  console.log('\n✅ Concluído!');
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ Falha:', err);
  process.exit(1);
});
