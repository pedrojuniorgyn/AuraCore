import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

/**
 * E5 BATCH 2 - Corrige blocos catch externos que usam errorMessage de escopo interno
 * 
 * PROBLEMA: 28 erros TS2304 restantes onde catch externo referencia errorMessage do interno
 * 
 * Estratégia: Para cada bloco catch que usa errorMessage mas não o define,
 * verificar se errorMessage já existe em outro bloco catch aninhado.
 * Se sim, adicionar no escopo externo também.
 */

const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const files = globSync('**/*.ts', { cwd: srcDir });

let totalFixed = 0;
let filesModified = 0;

console.log('🔧 E5 BATCH 2: Corrigindo errorMessage em escopos aninhados...');
console.log(`\n📁 Processando ${files.length} arquivos TypeScript\n`);

for (const file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Lista para armazenar modificações a serem aplicadas (do final para o início para não bagunçar índices)
  const modifications: { position: number; text: string }[] = [];
  
  // Regex para encontrar blocos catch (error: unknown)
  const catchRegex = /catch\s*\(\s*error\s*:\s*unknown\s*\)\s*\{/g;
  let match;
  
  while ((match = catchRegex.exec(content)) !== null) {
    const catchStart = match.index;
    const catchOpenBrace = catchStart + match[0].length;
    
    // Encontra o bloco completo do catch
    let braceCount = 1;
    let catchEnd = catchOpenBrace;
    while (braceCount > 0 && catchEnd < content.length) {
      if (content[catchEnd] === '{') braceCount++;
      if (content[catchEnd] === '}') braceCount--;
      catchEnd++;
    }
    
    const catchBlock = content.substring(catchStart, catchEnd);
    
    // Verifica se o bloco usa errorMessage mas não o define
    const usesErrorMessage = /\berrorMessage\b/.test(catchBlock);
    const definesErrorMessage = /const\s+errorMessage\s*=/.test(catchBlock);
    
    if (usesErrorMessage && !definesErrorMessage) {
      // Adiciona const errorMessage logo após a abertura do bloco catch
      modifications.push({
        position: catchOpenBrace,
        text: '\n    const errorMessage = error instanceof Error ? error.message : String(error);'
      });
    }
  }
  
  // Aplica modificações do final para o início
  if (modifications.length > 0) {
    modifications.sort((a, b) => b.position - a.position);
    
    for (const mod of modifications) {
      content = content.substring(0, mod.position) + mod.text + content.substring(mod.position);
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${file}: ${modifications.length} bloco(s) corrigido(s)`);
    totalFixed += modifications.length;
    filesModified++;
  }
}

console.log('\n📊 RESUMO:');
console.log(`  Arquivos processados: ${files.length}`);
console.log(`  Arquivos modificados: ${filesModified}`);
console.log(`  Blocos catch corrigidos: ${totalFixed}`);
console.log('\n✅ Script concluído!');

