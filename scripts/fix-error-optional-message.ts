import * as fs from 'fs';
import * as path from 'path';

/**
 * E7-TS FASE 1 - BATCH 1.1: Corrigir error?.message
 * 
 * Problema: error?.message usado diretamente sem type guard
 * Solução: Adicionar const errorMessage com type guard
 */

const filesToFix = [
  'src/app/api/admin/users/[id]/access/route.ts',
  'src/app/api/admin/users/[id]/password/route.ts',
  'src/app/api/admin/users/invite/route.ts',
  'src/app/api/documents/jobs/[id]/retry/route.ts',
  'src/app/api/documents/jobs/[id]/route.ts',
  'src/app/api/documents/jobs/route.ts',
  'src/app/api/documents/jobs/run/route.ts',
  'src/app/api/financial/billing/[id]/finalize/route.ts',
  'src/app/api/tenant/branch/route.ts',
];

let totalFixed = 0;
let filesModified = 0;

console.log('🔧 E7-TS FASE 1 - BATCH 1.1: Corrigindo error?.message...\n');

for (const file of filesToFix) {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file}: não encontrado`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let modificationsInFile = 0;

  // Padrão 1: error?.message || String(error)
  const pattern1 = /error\?\.(message)\s*\|\|\s*String\(error\)/g;
  if (pattern1.test(content)) {
    modificationsInFile++;
    content = content.replace(pattern1, 'errorMessage');
  }

  // Padrão 2: error?.message ?? String(error)
  const pattern2 = /error\?\.(message)\s*\?\?\s*String\(error\)/g;
  if (pattern2.test(content)) {
    modificationsInFile++;
    content = content.replace(pattern2, 'errorMessage');
  }

  // Padrão 3: apenas error?.message (sem fallback)
  const pattern3 = /error\?\.(message)/g;
  if (pattern3.test(content)) {
    modificationsInFile++;
    content = content.replace(pattern3, 'errorMessage');
  }

  // Agora adicionar const errorMessage nos blocos catch que não têm
  // Encontrar blocos catch (error: unknown)
  const catchBlocks = content.matchAll(/catch\s*\(\s*error\s*:\s*unknown\s*\)\s*\{/g);
  const modifications: { position: number; text: string }[] = [];

  for (const match of catchBlocks) {
    const catchStart = match.index!;
    const catchOpenBrace = catchStart + match[0].length;

    // Encontrar o bloco completo do catch
    let braceCount = 1;
    let catchEnd = catchOpenBrace;
    while (braceCount > 0 && catchEnd < content.length) {
      if (content[catchEnd] === '{') braceCount++;
      if (content[catchEnd] === '}') braceCount--;
      catchEnd++;
    }

    const catchBlockContent = content.substring(catchOpenBrace, catchEnd - 1);

    // Verifica se o bloco usa errorMessage mas não o define
    const usesErrorMessage = /\berrorMessage\b/.test(catchBlockContent);
    const definesErrorMessage = /const\s+errorMessage\s*=/.test(catchBlockContent);

    if (usesErrorMessage && !definesErrorMessage) {
      const insertPoint = catchOpenBrace;
      const errorMessageDefinition = '\n    const errorMessage = error instanceof Error ? error.message : String(error);';
      
      modifications.push({
        position: insertPoint,
        text: errorMessageDefinition
      });
    }
  }

  // Aplica as modificações em ordem reversa
  if (modifications.length > 0) {
    modifications.sort((a, b) => b.position - a.position);
    for (const mod of modifications) {
      content = content.substring(0, mod.position) + mod.text + content.substring(mod.position);
    }
    modificationsInFile += modifications.length;
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ ${file}: ${modificationsInFile} correção(ões)`);
    totalFixed += modificationsInFile;
    filesModified++;
  }
}

console.log(`\n📊 RESUMO:`);
console.log(`  Arquivos processados: ${filesToFix.length}`);
console.log(`  Arquivos modificados: ${filesModified}`);
console.log(`  Total de correções: ${totalFixed}`);
console.log('\n✅ Script concluído!');

