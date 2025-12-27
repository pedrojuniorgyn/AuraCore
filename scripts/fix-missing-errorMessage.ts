import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

/**
 * E5 - Adiciona errorMessage em blocos catch (error: unknown) que o usam mas não o definem
 * 
 * PROBLEMA: 150 erros TS2304 "Cannot find name 'errorMessage'"
 * 
 * Padrão bugado:
 * catch (error: unknown) {
 *   return NextResponse.json({ error: errorMessage }, { status: 500 });
 * }
 * 
 * Padrão correto:
 * catch (error: unknown) {
 *   const errorMessage = error instanceof Error ? error.message : String(error);
 *   return NextResponse.json({ error: errorMessage }, { status: 500 });
 * }
 */

// Resolve path from project root
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');
const files = globSync('**/*.ts', { cwd: srcDir });

let totalFixed = 0;
let filesModified = 0;

console.log('🔧 E5: Adicionando errorMessage em blocos catch...');
console.log(`\n📁 Processando ${files.length} arquivos TypeScript em ${srcDir}\n`);

for (const file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  
  // Regex para encontrar blocos catch (error: unknown) que:
  // 1. Não têm "const errorMessage =" já definido
  // 2. Usam errorMessage em algum lugar do bloco
  
  // Encontra blocos catch (error: unknown)
  const catchBlocks = content.matchAll(/catch\s*\(\s*error\s*:\s*unknown\s*\)\s*\{/g);
  
  let modifications = 0;
  
  for (const match of catchBlocks) {
    const catchStart = match.index!;
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
      const insertPoint = catchOpenBrace;
      const errorMessageDefinition = '\n    const errorMessage = error instanceof Error ? error.message : String(error);';
      
      content = content.substring(0, insertPoint) + errorMessageDefinition + content.substring(insertPoint);
      
      modifications++;
      
      // Ajusta catchEnd para o novo tamanho
      catchEnd += errorMessageDefinition.length;
    }
  }
  
  if (modifications > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${file}: ${modifications} bloco(s) corrigido(s)`);
    totalFixed += modifications;
    filesModified++;
  }
}

console.log('\n📊 RESUMO:');
console.log(`  Arquivos processados: ${files.length}`);
console.log(`  Arquivos modificados: ${filesModified}`);
console.log(`  Blocos catch corrigidos: ${totalFixed}`);
console.log('\n✅ Script concluído!');

