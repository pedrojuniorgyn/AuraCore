#!/usr/bin/env node
/**
 * Script: Detectar imports legacy de schemas INT
 * Contexto: Financial/Fiscal refactoring - garantir que apenas schemas DDD UUID estão sendo usados
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Tabelas que foram migradas para DDD (UUID char(36))
const MIGRATED_TABLES = [
  'accountsPayable',
  'accountsReceivable', 
  'payments',
  'journalEntries',
  'journalEntryLines',
  'financialTransactions',
];

// Schemas DDD corretos (com sufixo Table)
const CORRECT_IMPORTS = MIGRATED_TABLES.map(t => `${t}Table`);

console.log('🔍 Buscando imports legacy de schemas INT...\n');

let hasIssues = false;

for (const table of MIGRATED_TABLES) {
  // Buscar imports do schema legacy (sem sufixo Table)
  const grepCmd = `grep -r "from.*schema" src/ | grep "${table}" | grep -v "${table}Table" | grep -v "node_modules" || true`;
  
  try {
    const result = execSync(grepCmd, { encoding: 'utf-8' });
    
    if (result.trim()) {
      console.log(`❌ ${table} (legacy INT) ainda sendo importado:\n`);
      console.log(result);
      hasIssues = true;
    }
  } catch (err) {
    // grep retorna exit code 1 se não encontrar nada (isso é OK)
  }
}

// Verificar se barrel exports estão corretos
console.log('\n📦 Verificando barrel exports...\n');

const schemaMainPath = 'src/lib/db/schema.ts';
const schemaContent = readFileSync(schemaMainPath, 'utf-8');

for (const table of MIGRATED_TABLES) {
  const correctExport = `${table}Table`;
  
  if (schemaContent.includes(`export const ${table} =`) && !schemaContent.includes('// REMOVED')) {
    console.log(`❌ ${schemaMainPath} ainda tem definição legacy: export const ${table}`);
    hasIssues = true;
  }
  
  if (!schemaContent.includes(correctExport)) {
    console.log(`⚠️  ${schemaMainPath} NÃO exporta ${correctExport} (pode estar em barrel filho)`);
  }
}

// Verificar definições duplicadas
console.log('\n🔄 Verificando definições duplicadas...\n');

for (const table of MIGRATED_TABLES) {
  const grepCmd = `grep -r "export const ${table}.*=.*Table\\|export const ${table} =.*sqlServerTable\\|export const ${table} =.*mssqlTable" src/ | grep -v node_modules || true`;
  
  try {
    const result = execSync(grepCmd, { encoding: 'utf-8' });
    const lines = result.trim().split('\n').filter(l => l.trim());
    
    if (lines.length > 1) {
      console.log(`❌ DUPLICADO: ${table} definido em múltiplos lugares:\n`);
      lines.forEach(line => console.log(`   ${line}`));
      hasIssues = true;
    }
  } catch (err) {
    // OK
  }
}

if (!hasIssues) {
  console.log('✅ Nenhum import legacy detectado! Código limpo.\n');
  process.exit(0);
} else {
  console.log('\n❌ Issues detectados. Revisar antes de commit.\n');
  process.exit(1);
}
