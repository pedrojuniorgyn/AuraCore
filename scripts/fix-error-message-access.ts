import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

const srcDir = path.join(__dirname, '../src');
const files = globSync('**/*.ts', { cwd: srcDir });

let totalSubstitutions = 0;
let filesModified = 0;
let filesProcessed = 0;

console.log('🔧 E3 BATCH 3: Corrigindo acesso a error.message sem type guard...');
console.log(`\n📁 Encontrados ${files.length} arquivos TypeScript em ${srcDir}\n`);

for (const file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let substitutionsInFile = 0;
  
  filesProcessed++;

  // Padrão 1: Substituir error.message por errorMessage
  // Apenas dentro de blocos catch (error: unknown)
  const catchBlockRegex = /catch\s*\(\s*error\s*:\s*unknown\s*\)\s*\{[^}]*\}/g;
  
  content = content.replace(catchBlockRegex, (catchBlock) => {
    let modifiedBlock = catchBlock;
    let blockModified = false;

    // Verificar se já tem errorMessage definido
    const hasErrorMessage = /const\s+errorMessage\s*=/.test(modifiedBlock);
    
    // Substituir error.message por errorMessage
    const errorMessageCount = (modifiedBlock.match(/\berror\.message\b/g) || []).length;
    if (errorMessageCount > 0) {
      modifiedBlock = modifiedBlock.replace(/\berror\.message\b/g, 'errorMessage');
      substitutionsInFile += errorMessageCount;
      blockModified = true;
    }

    // Substituir error.stack por type guard
    const errorStackCount = (modifiedBlock.match(/\berror\.stack\b/g) || []).length;
    if (errorStackCount > 0) {
      modifiedBlock = modifiedBlock.replace(
        /\berror\.stack\b/g, 
        '(error instanceof Error ? error.stack : undefined)'
      );
      substitutionsInFile += errorStackCount;
      blockModified = true;
    }

    // Substituir error.name por type guard
    const errorNameCount = (modifiedBlock.match(/\berror\.name\b/g) || []).length;
    if (errorNameCount > 0) {
      modifiedBlock = modifiedBlock.replace(
        /\berror\.name\b/g, 
        "(error instanceof Error ? error.name : 'Error')"
      );
      substitutionsInFile += errorNameCount;
      blockModified = true;
    }

    // Substituir error.code (Node.js errors)
    const errorCodeCount = (modifiedBlock.match(/\berror\.code\b/g) || []).length;
    if (errorCodeCount > 0) {
      modifiedBlock = modifiedBlock.replace(
        /\berror\.code\b/g, 
        "((error as NodeJS.ErrnoException).code)"
      );
      substitutionsInFile += errorCodeCount;
      blockModified = true;
    }

    return modifiedBlock;
  });

  if (substitutionsInFile > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${file}: ${substitutionsInFile} substituições`);
    totalSubstitutions += substitutionsInFile;
    filesModified++;
  }
}

console.log('\n📊 RESUMO:');
console.log(`  Arquivos processados: ${filesProcessed}`);
console.log(`  Arquivos modificados: ${filesModified}`);
console.log(`  Total de substituições: ${totalSubstitutions}`);
console.log('\n✅ Script concluído!\n');

console.log('🔍 Próximos passos:');
console.log('1. Verificar erros TS18046: npx tsc --noEmit 2>&1 | grep "TS18046" | wc -l');
console.log('2. Se ainda houver erros, revisar manualmente casos complexos');
console.log('3. Fazer commit e registrar correção no MCP\n');

