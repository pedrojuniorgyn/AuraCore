/**
 * Script para corrigir catch (error: any) → catch (error: unknown)
 * 
 * Refs: E2, LC-002 (error-handling-unknown)
 */

import * as fs from 'fs';
import * as path from 'path';

interface Stats {
  filesProcessed: number;
  filesModified: number;
  totalReplacements: number;
  errors: string[];
}

const stats: Stats = {
  filesProcessed: 0,
  filesModified: 0,
  totalReplacements: 0,
  errors: [],
};

/**
 * Corrige um bloco catch (error: any)
 */
function fixCatchBlock(content: string): string {
  // Pattern: catch (error: any) { ... }
  // Substitui apenas "error: any" por "error: unknown"
  const pattern = /catch\s*\(\s*error\s*:\s*any\s*\)/g;
  
  return content.replace(pattern, 'catch (error: unknown)');
}

/**
 * Busca recursivamente arquivos .ts em um diretório
 */
function findTsFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      findTsFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Processa um arquivo
 */
function processFile(filePath: string): void {
  stats.filesProcessed++;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Verifica se tem catch (error: any)
    if (!content.includes('catch (error: any)')) {
      return;
    }
    
    const fixedContent = fixCatchBlock(content);
    
    // Conta quantas substituições foram feitas
    const originalMatches = (content.match(/catch\s*\(\s*error\s*:\s*any\s*\)/g) || []).length;
    const fixedMatches = (fixedContent.match(/catch\s*\(\s*error\s*:\s*any\s*\)/g) || []).length;
    const replacements = originalMatches - fixedMatches;
    
    if (replacements > 0) {
      fs.writeFileSync(filePath, fixedContent, 'utf-8');
      stats.filesModified++;
      stats.totalReplacements += replacements;
      console.log(`✅ ${path.relative(process.cwd(), filePath)}: ${replacements} substituições`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stats.errors.push(`${filePath}: ${errorMessage}`);
    console.error(`❌ Erro em ${filePath}:`, errorMessage);
  }
}

/**
 * Processa todos os arquivos em src/app/api
 */
function main() {
  console.log('🔧 Iniciando correção de catch (error: any)...\n');
  
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  const files = findTsFiles(apiDir);
  
  console.log(`📁 Encontrados ${files.length} arquivos TypeScript em src/app/api\n`);
  
  for (const file of files) {
    processFile(file);
  }
  
  console.log('\n📊 RESUMO:');
  console.log(`  Arquivos processados: ${stats.filesProcessed}`);
  console.log(`  Arquivos modificados: ${stats.filesModified}`);
  console.log(`  Total de substituições: ${stats.totalReplacements}`);
  
  if (stats.errors.length > 0) {
    console.log(`\n❌ Erros: ${stats.errors.length}`);
    stats.errors.forEach(err => console.log(`  ${err}`));
  } else {
    console.log('\n✅ Nenhum erro encontrado!');
  }
}

main();

