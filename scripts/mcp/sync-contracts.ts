#!/usr/bin/env tsx
/**
 * Script de migração de conhecimento para MCP Server
 * 
 * Migra contratos e ADRs de Markdown para JSON estruturado
 * na knowledge base do MCP Server.
 */

import fs from 'fs/promises';
import path from 'path';

// Tipos
interface Contract {
  id: string;
  title: string;
  type: 'contract';
  content: string;
  sections: Section[];
  rules: string[];
  metadata: {
    sourceFile: string;
    migratedAt: string;
    version: string;
  };
}

interface ADR {
  id: string;
  number: string;
  title: string;
  type: 'adr';
  status: string;
  context: string;
  decision: string;
  consequences: string;
  content: string;
  metadata: {
    sourceFile: string;
    migratedAt: string;
    version: string;
  };
}

interface Section {
  heading: string;
  level: number;
  content: string;
}

// Caminhos
const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const CONTRACTS_SOURCE = path.join(WORKSPACE_ROOT, 'docs/architecture/contracts');
const ADR_SOURCE = path.join(WORKSPACE_ROOT, 'docs/architecture/adr');
const CONTRACTS_DEST = path.join(WORKSPACE_ROOT, 'mcp-server/knowledge/contracts');
const ADR_DEST = path.join(WORKSPACE_ROOT, 'mcp-server/knowledge/adrs');

// Lista de contratos para migrar
const CONTRACTS_TO_MIGRATE = [
  'API_CONTRACT.md',
  'TENANT_BRANCH_CONTRACT.md',
  'RBAC_CONTRACT.md',
  'ERROR_CONTRACT.md',
  'TRANSACTIONS_CONTRACT.md',
  'SQLSERVER_PERFORMANCE_CONTRACT.md',
];

/**
 * Parse markdown e extrai seções
 */
function parseSections(content: string): Section[] {
  const sections: Section[] = [];
  const lines = content.split('\n');
  let currentSection: Section | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Detectar headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      // Salvar seção anterior se existir
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection);
      }
      
      // Iniciar nova seção
      const level = headingMatch[1].length;
      const heading = headingMatch[2].trim();
      
      currentSection = {
        heading,
        level,
        content: '',
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  
  // Salvar última seção
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    sections.push(currentSection);
  }
  
  return sections;
}

/**
 * Extrai regras de um contrato (linhas que começam com -)
 */
function extractRules(content: string): string[] {
  const rules: string[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      rules.push(trimmed.substring(2));
    }
  }
  
  return rules;
}

/**
 * Converte nome de arquivo para ID
 */
function fileNameToId(fileName: string): string {
  return fileName
    .replace('.md', '')
    .toLowerCase()
    .replace(/_/g, '-');
}

/**
 * Migra um contrato de MD para JSON
 */
async function migrateContract(fileName: string): Promise<void> {
  const sourcePath = path.join(CONTRACTS_SOURCE, fileName);
  const content = await fs.readFile(sourcePath, 'utf-8');
  
  const sections = parseSections(content);
  const rules = extractRules(content);
  
  // Extrair título (primeira linha após o H1)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : fileName.replace('.md', '');
  
  const contract: Contract = {
    id: fileNameToId(fileName),
    title,
    type: 'contract',
    content,
    sections,
    rules,
    metadata: {
      sourceFile: `docs/architecture/contracts/${fileName}`,
      migratedAt: new Date().toISOString(),
      version: '1.0.0',
    },
  };
  
  // Salvar JSON
  const destPath = path.join(CONTRACTS_DEST, fileName.replace('.md', '.json'));
  await fs.writeFile(destPath, JSON.stringify(contract, null, 2), 'utf-8');
  
  console.log(`✅ Migrado: ${fileName} → ${path.basename(destPath)}`);
}

/**
 * Migra um ADR de MD para JSON
 */
async function migrateADR(fileName: string): Promise<void> {
  const sourcePath = path.join(ADR_SOURCE, fileName);
  const content = await fs.readFile(sourcePath, 'utf-8');
  
  // Extrair número e título
  const titleMatch = content.match(/^#\s+ADR\s+(\d+)\s+[—-]\s+(.+)$/m);
  const number = titleMatch ? titleMatch[1] : '0000';
  const title = titleMatch ? titleMatch[2].trim() : fileName.replace('.md', '');
  
  // Extrair seções específicas do ADR
  const statusMatch = content.match(/##\s+Status\s*\n([^#]+)/);
  const contextMatch = content.match(/##\s+Contexto\s*\n([^#]+)/);
  const decisionMatch = content.match(/##\s+Decisão\s*\n([^#]+)/);
  const consequencesMatch = content.match(/##\s+Consequências\s*\n([^#]+)/);
  
  const adr: ADR = {
    id: fileNameToId(fileName),
    number,
    title,
    type: 'adr',
    status: statusMatch ? statusMatch[1].trim() : 'Unknown',
    context: contextMatch ? contextMatch[1].trim() : '',
    decision: decisionMatch ? decisionMatch[1].trim() : '',
    consequences: consequencesMatch ? consequencesMatch[1].trim() : '',
    content,
    metadata: {
      sourceFile: `docs/architecture/adr/${fileName}`,
      migratedAt: new Date().toISOString(),
      version: '1.0.0',
    },
  };
  
  // Salvar JSON
  const destPath = path.join(ADR_DEST, fileName.replace('.md', '.json'));
  await fs.writeFile(destPath, JSON.stringify(adr, null, 2), 'utf-8');
  
  console.log(`✅ Migrado ADR: ${fileName} → ${path.basename(destPath)}`);
}

/**
 * Main
 */
async function main() {
  console.log('🚀 Iniciando migração de conhecimento para MCP Server\n');
  
  // Garantir que diretórios de destino existem
  await fs.mkdir(CONTRACTS_DEST, { recursive: true });
  await fs.mkdir(ADR_DEST, { recursive: true });
  
  // Migrar contratos
  console.log('📄 Migrando contratos...');
  for (const fileName of CONTRACTS_TO_MIGRATE) {
    try {
      await migrateContract(fileName);
    } catch (error) {
      console.error(`❌ Erro ao migrar ${fileName}:`, error);
    }
  }
  
  // Migrar ADRs (todos os arquivos .md na pasta)
  console.log('\n📋 Migrando ADRs...');
  const adrFiles = await fs.readdir(ADR_SOURCE);
  const adrMarkdownFiles = adrFiles.filter(f => f.endsWith('.md'));
  
  for (const fileName of adrMarkdownFiles) {
    try {
      await migrateADR(fileName);
    } catch (error) {
      console.error(`❌ Erro ao migrar ${fileName}:`, error);
    }
  }
  
  console.log('\n✅ Migração concluída com sucesso!');
  console.log(`\n📊 Resumo:`);
  console.log(`   - Contratos: ${CONTRACTS_TO_MIGRATE.length}`);
  console.log(`   - ADRs: ${adrMarkdownFiles.length}`);
}

// Executar
main().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

