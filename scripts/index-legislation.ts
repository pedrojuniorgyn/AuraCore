#!/usr/bin/env npx tsx
/**
 * Script para indexar legislação fiscal no ChromaDB
 * 
 * Uso: npx tsx scripts/index-legislation.ts
 * 
 * Estrutura esperada:
 * data/knowledge/legislation/
 * ├── icms/
 * │   └── lei_kandir.md
 * ├── pis_cofins/
 * │   └── regime_nao_cumulativo.md
 * ├── reforma_2026/
 * │   └── ibs_cbs.md
 * └── cte/
 *     └── conhecimento_transporte.md
 * 
 * @see Phase D8 - RAG for Fiscal Legislation
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// Mapeamento de pasta para tipo de legislação
const FOLDER_TO_TYPE: Record<string, string> = {
  'icms': 'ICMS',
  'pis_cofins': 'PIS_COFINS',
  'ipi': 'IPI',
  'irpj_csll': 'IRPJ_CSLL',
  'iss': 'ISS',
  'reforma_2026': 'REFORMA_2026',
  'sped': 'SPED',
  'cte': 'CTE',
  'nfe': 'NFE',
  'mdfe': 'MDFE',
  'trabalhista': 'TRABALHISTA',
  'outros': 'OUTROS',
};

// Configuração de chunking
const CHUNK_SIZE = 1000; // caracteres por chunk
const CHUNK_OVERLAP = 200; // sobreposição entre chunks

interface IndexResult {
  file: string;
  chunks: number;
  success: boolean;
  error?: string;
}

/**
 * Divide texto em chunks com sobreposição
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    
    if (start >= text.length - overlap) break;
  }
  
  return chunks.filter(chunk => chunk.trim().length > 50);
}

/**
 * Gera embedding usando Gemini
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ 
    model: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004' 
  });
  
  const response = await model.embedContent({
    content: { role: 'user', parts: [{ text }] },
  });
  
  return response.embedding.values;
}

/**
 * Cria ou obtém collection no ChromaDB
 */
async function getOrCreateCollection(
  chromaUrl: string, 
  collectionName: string
): Promise<string> {
  const listResponse = await fetch(`${chromaUrl}/api/v1/collections`);
  const collections = await listResponse.json() as Array<{ name: string; id: string }>;
  
  const existing = collections.find(c => c.name === collectionName);
  if (existing) {
    return existing.id;
  }
  
  const createResponse = await fetch(`${chromaUrl}/api/v1/collections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: collectionName,
      metadata: { 
        description: 'AuraCore Knowledge Base - Legislação Fiscal Brasileira',
        created: new Date().toISOString(),
      },
    }),
  });
  
  if (!createResponse.ok) {
    throw new Error(`Falha ao criar collection: ${await createResponse.text()}`);
  }
  
  const created = await createResponse.json() as { id: string };
  return created.id;
}

/**
 * Adiciona documentos ao ChromaDB
 */
async function addDocuments(
  chromaUrl: string,
  collectionId: string,
  documents: Array<{
    id: string;
    content: string;
    embedding: number[];
    metadata: Record<string, unknown>;
  }>
): Promise<void> {
  const response = await fetch(
    `${chromaUrl}/api/v1/collections/${collectionId}/add`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: documents.map(d => d.id),
        documents: documents.map(d => d.content),
        embeddings: documents.map(d => d.embedding),
        metadatas: documents.map(d => d.metadata),
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Falha ao adicionar documentos: ${await response.text()}`);
  }
}

async function main(): Promise<void> {
  console.log('🚀 Iniciando indexação de legislação...\n');

  const googleApiKey = process.env.GOOGLE_AI_API_KEY;
  if (!googleApiKey) {
    console.error('❌ GOOGLE_AI_API_KEY não configurada');
    console.log('   Execute: export GOOGLE_AI_API_KEY=sua_key');
    process.exit(1);
  }

  // Porta 8001 é padrão local (docker/chroma/docker-compose.yml mapeia 8001:8000)
  const chromaHost = process.env.CHROMA_HOST ?? 'localhost';
  const chromaPort = process.env.CHROMA_PORT ?? '8001';
  const chromaUrl = `http://${chromaHost}:${chromaPort}`;
  const collectionName = process.env.CHROMA_COLLECTION ?? 'auracore_knowledge';

  console.log(`📡 ChromaDB: ${chromaUrl}`);
  console.log(`📚 Collection: ${collectionName}\n`);

  // Testar conexão
  try {
    const heartbeat = await fetch(`${chromaUrl}/api/v1/heartbeat`);
    if (!heartbeat.ok) throw new Error(`HTTP ${heartbeat.status}`);
    console.log('✅ ChromaDB conectado\n');
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Falha ao conectar ao ChromaDB: ${msg}`);
    console.log('\n💡 Dica: Inicie o ChromaDB com:');
    console.log('   cd docker/chroma && docker-compose up -d');
    process.exit(1);
  }

  const startTime = Date.now();
  const baseDir = path.join(process.cwd(), 'data/knowledge/legislation');

  // Criar estrutura se não existe
  try {
    await fs.access(baseDir);
  } catch {
    console.log(`📁 Criando estrutura em: ${baseDir}\n`);
    
    for (const folder of Object.keys(FOLDER_TO_TYPE)) {
      const folderPath = path.join(baseDir, folder);
      await fs.mkdir(folderPath, { recursive: true });
      console.log(`   ✅ ${folder}/`);
    }
    
    console.log('\n✅ Estrutura criada!');
    console.log('   Adicione arquivos .md ou .txt nas pastas.');
    console.log('\n   Execute o script novamente após adicionar os arquivos.');
    process.exit(0);
  }

  const collectionId = await getOrCreateCollection(chromaUrl, collectionName);
  console.log(`📦 Collection ID: ${collectionId}\n`);

  const results: IndexResult[] = [];
  let totalChunks = 0;

  const folders = await fs.readdir(baseDir, { withFileTypes: true });

  for (const folder of folders) {
    if (!folder.isDirectory()) continue;

    const folderPath = path.join(baseDir, folder.name);
    const legislationType = FOLDER_TO_TYPE[folder.name] ?? 'OUTROS';

    console.log(`\n📁 ${folder.name}/ (${legislationType})`);

    const files = await fs.readdir(folderPath);
    const docs = files.filter(f => f.endsWith('.md') || f.endsWith('.txt'));

    if (docs.length === 0) {
      console.log('   (pasta vazia)');
      continue;
    }

    for (const file of docs) {
      const filePath = path.join(folderPath, file);
      const title = file.replace(/\.(md|txt)$/, '').replace(/_/g, ' ');

      process.stdout.write(`   📄 ${file}... `);

      try {
        const content = await fs.readFile(filePath, 'utf-8');

        if (content.trim().length < 50) {
          console.log('⚠️ muito curto');
          results.push({ file, chunks: 0, success: false, error: 'muito curto' });
          continue;
        }

        const chunks = chunkText(content, CHUNK_SIZE, CHUNK_OVERLAP);
        
        const documents: Array<{
          id: string;
          content: string;
          embedding: number[];
          metadata: Record<string, unknown>;
        }> = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunkId = `${folder.name}_${file.replace(/\.(md|txt)$/, '')}_chunk_${i}`;
          
          // Rate limiting - 100ms entre requests
          if (i > 0) await new Promise(r => setTimeout(r, 100));
          
          const embedding = await generateEmbedding(chunks[i], googleApiKey);
          
          documents.push({
            id: chunkId,
            content: chunks[i],
            embedding,
            metadata: {
              title,
              type: 'LEGISLATION',
              legislationType,
              source: `file://${filePath}`,
              chunkIndex: i,
              totalChunks: chunks.length,
              indexedAt: new Date().toISOString(),
            },
          });
        }

        await addDocuments(chromaUrl, collectionId, documents);

        console.log(`✅ ${chunks.length} chunks`);
        results.push({ file, chunks: chunks.length, success: true });
        totalChunks += chunks.length;

        // Rate limiting entre arquivos - 500ms
        await new Promise(r => setTimeout(r, 500));

      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`❌ ${msg}`);
        results.push({ file, chunks: 0, success: false, error: msg });
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '═'.repeat(50));
  console.log('📊 RESUMO DA INDEXAÇÃO');
  console.log('═'.repeat(50));
  console.log(`   Arquivos processados: ${results.length}`);
  console.log(`   ✅ Sucesso: ${results.filter(r => r.success).length}`);
  console.log(`   ❌ Erros: ${results.filter(r => !r.success).length}`);
  console.log(`   📄 Total de chunks: ${totalChunks}`);
  console.log(`   ⏱️  Tempo: ${totalTime}s`);
  console.log('═'.repeat(50));

  const errors = results.filter(r => !r.success);
  if (errors.length > 0) {
    console.log('\n⚠️ Arquivos com erro:');
    errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
  }

  console.log('\n✅ Indexação concluída!');
  console.log('\n💡 Use a API de busca para consultar:');
  console.log('   POST /api/knowledge/search');
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error('❌ Erro fatal:', msg);
  process.exit(1);
});
