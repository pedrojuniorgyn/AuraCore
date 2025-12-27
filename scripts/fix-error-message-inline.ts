import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

const srcDir = path.join(__dirname, '../src');
const files = globSync('**/*.ts', { cwd: srcDir });

let totalSubstitutions = 0;
let filesModified = 0;
let filesProcessed = 0;

console.log('🔧 E3 BATCH 3.2: Corrigindo error.message em blocos catch (error: unknown)...');
console.log(`\n📁 Encontrados ${files.length} arquivos TypeScript em ${srcDir}\n`);

for (const file of files) {
  const filePath = path.join(srcDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let substitutionsInFile = 0;
  
  filesProcessed++;

  // Encontrar TODOS os blocos catch (error: unknown) que usam error.message
  // Estratégia: usar regex mais simples e processar linha a linha dentro do bloco
  
  const catchUnknownRegex = /catch\s*\(\s*error\s*:\s*unknown\s*\)\s*\{/g;
  const matches = [...content.matchAll(catchUnknownRegex)];
  
  if (matches.length === 0) continue;

  // Processar cada match de trás para frente para não quebrar índices
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const startIndex = match.index!;
    
    // Encontrar o fechamento do bloco catch
    let braceCount = 1;
    let endIndex = startIndex + match[0].length;
    
    while (braceCount > 0 && endIndex < content.length) {
      if (content[endIndex] === '{') braceCount++;
      if (content[endIndex] === '}') braceCount--;
      endIndex++;
    }
    
    if (braceCount !== 0) continue; // Bloco malformado
    
    let catchBlock = content.substring(startIndex, endIndex);
    const originalBlock = catchBlock;
    
    // Verificar se usa error.message
    if (!catchBlock.includes('error.message')) continue;
    
    // Verificar se JÁ tem errorMessage definido
    const hasErrorMessage = /const\s+errorMessage\s*=/.test(catchBlock);
    
    if (!hasErrorMessage) {
      // Adicionar const errorMessage logo após a abertura do catch
      const insertPoint = catchBlock.indexOf('{') + 1;
      const errorMessageDecl = '\n  const errorMessage = error instanceof Error ? error.message : String(error);';
      catchBlock = catchBlock.slice(0, insertPoint) + errorMessageDecl + catchBlock.slice(insertPoint);
      substitutionsInFile++;
    }
    
    // Substituir TODOS os error.message por errorMessage
    const errorMessageCount = (catchBlock.match(/error\.message/g) || []).length;
    catchBlock = catchBlock.replace(/error\.message/g, 'errorMessage');
    substitutionsInFile += errorMessageCount;
    
    // Substituir no conteúdo original
    if (catchBlock !== originalBlock) {
      content = content.substring(0, startIndex) + catchBlock + content.substring(endIndex);
    }
  }

  if (content !== originalContent) {
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
console.log('2. Verificar regressão: comparar com baseline (713 erros)');
console.log('3. Verificar padrão antigo: grep -rn "error\\.message" src --include="*.ts" | grep -v "errorMessage\\|instanceof" | wc -l');
console.log('4. Se OK: fazer commit e registrar correção\n');
