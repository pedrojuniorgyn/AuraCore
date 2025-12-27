import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

/**
 * E4 - Corrige referências circulares em errorMessage
 * 
 * BUG: const errorMessage = error instanceof Error ? errorMessage : String(error);
 * FIX: const errorMessage = error instanceof Error ? error.message : String(error);
 * 
 * Introduzido por: E3 BATCH 3.2 (fix-error-message-inline.ts)
 * Detectado por: tsc TS7022 + TS2448 (102 + 102 = 204 erros)
 */

// Resolve path from project root, not relative to __dirname
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const files = globSync('**/*.ts', { cwd: srcDir });

let totalFixed = 0;
let filesModified = 0;

console.log('🔧 E4: Corrigindo referências circulares em errorMessage...');
console.log(`\n📁 Encontrados ${files.length} arquivos TypeScript em ${srcDir}\n`);

for (const file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Padrão BUG: ? errorMessage :
  // (captura "error instanceof Error ? errorMessage :" ou qualquer variação)
  const bugPattern = /\?\s*errorMessage\s*:/g;
  
  // Contar ocorrências antes
  const matches = content.match(bugPattern);
  
  if (matches && matches.length > 0) {
    // Substituir TODAS as ocorrências
    content = content.replace(bugPattern, '? error.message :');
    
    // Verificar se realmente mudou
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✅ ${file}: ${matches.length} correção(ões)`);
      totalFixed += matches.length;
      filesModified++;
    }
  }
}

console.log('\n📊 RESUMO:');
console.log(`  Arquivos processados: ${files.length}`);
console.log(`  Arquivos modificados: ${filesModified}`);
console.log(`  Total de correções: ${totalFixed}`);
console.log('\n✅ Script concluído!');

