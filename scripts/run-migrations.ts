/**
 * Script: Executar Migrations SQL
 * 
 * Executa as migrations SQL pendentes no banco de dados.
 * 
 * Uso:
 * ```bash
 * npx tsx scripts/run-migrations.ts
 * ```
 */

import { pool } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
  console.log('🚀 Iniciando execução de migrations...\n');

  try {
    // Ler arquivo de migration
    const migrationPath = path.join(process.cwd(), 'migrations', 'create_all_marathon_tables.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Arquivo de migration não encontrado:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Lendo migration:', migrationPath);
    console.log(`📊 Tamanho: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

    // Dividir em statements individuais (separados por GO)
    // Se não houver GO, executar o arquivo inteiro como um statement
    let statements: string[];
    
    if (migrationSQL.includes('\nGO\n') || migrationSQL.includes('\ngo\n')) {
      statements = migrationSQL
        .split(/\nGO\n/gi)
        .map(s => s.trim())
        .filter(s => {
          if (s.length === 0) return false;
          // Only discard batches that are ENTIRELY comments/empty lines
          return s.split('\n').some(line => line.trim().length > 0 && !line.trim().startsWith('--'));
        });
    } else {
      // Arquivo sem separadores GO - executar inteiro
      statements = [migrationSQL.trim()];
    }

    console.log(`🔢 Total de statements: ${statements.length}\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Executar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 100).replace(/\n/g, ' ');
      
      try {
        await pool.query(statement);
        successCount++;
        console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
      } catch (error: unknown) {
        const err = error as { message?: string; number?: number };
        
        // Ignorar erros de "objeto já existe"
        if (err.message?.includes('already exists') || err.message?.includes('There is already an object')) {
          skipCount++;
          console.log(`⏭️  [${i + 1}/${statements.length}] ${preview}... (já existe)`);
        } else {
          errorCount++;
          console.error(`❌ [${i + 1}/${statements.length}] ${preview}...`);
          console.error(`   Erro: ${err.message}`);
        }
      }
    }

    console.log('\n📊 Resumo da Execução:');
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ⏭️  Pulados: ${skipCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    console.log(`   📝 Total: ${statements.length}\n`);

    if (errorCount === 0) {
      console.log('🎉 Migrations executadas com sucesso!');
    } else {
      console.log('⚠️  Algumas migrations falharam. Verifique os erros acima.');
    }

  } catch (error) {
    console.error('❌ Erro fatal ao executar migrations:', error);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

runMigrations();
