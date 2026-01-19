#!/usr/bin/env npx tsx
/**
 * Script para indexar legislação fiscal brasileira
 * 
 * Uso: 
 *   npx tsx scripts/index-legislation.ts
 * 
 * Este script lê arquivos de legislação do diretório data/knowledge/legislation
 * e indexa no vector store para busca via MCP tool search_legislation.
 * 
 * @see Phase D8 - RAG for Fiscal Legislation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Imports do módulo knowledge
import { JsonVectorStore } from '../src/modules/knowledge/infrastructure/vector-store/JsonVectorStore';
import { IndexDocumentUseCase } from '../src/modules/knowledge/application/commands/index-document';
import type { DocumentType, LegislationType } from '../src/modules/knowledge/domain/types';
import { Result } from '../src/shared/domain';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const LEGISLATION_DIR = 'data/knowledge/legislation';
const VECTOR_STORE_PATH = 'data/knowledge/vectors.json';

/**
 * Lista de documentos de legislação a serem indexados
 * Adicione arquivos .txt ou .md ao diretório data/knowledge/legislation
 */
interface LegislationFile {
  file: string;
  title: string;
  type: DocumentType;
  legislationType: LegislationType;
  tags: string[];
}

const LEGISLATION_FILES: LegislationFile[] = [
  {
    file: 'lei_kandir_lc87_96.txt',
    title: 'Lei Kandir - ICMS (LC 87/96)',
    type: 'LEGISLATION',
    legislationType: 'ICMS',
    tags: ['icms', 'imposto', 'circulação', 'mercadorias', 'lei-kandir'],
  },
  {
    file: 'lei_10637_02_pis.txt',
    title: 'Lei 10.637/02 - PIS não cumulativo',
    type: 'LEGISLATION',
    legislationType: 'PIS_COFINS',
    tags: ['pis', 'não-cumulativo', 'contribuição', 'federal'],
  },
  {
    file: 'lei_10833_03_cofins.txt',
    title: 'Lei 10.833/03 - COFINS não cumulativo',
    type: 'LEGISLATION',
    legislationType: 'PIS_COFINS',
    tags: ['cofins', 'não-cumulativo', 'contribuição', 'federal'],
  },
  {
    file: 'ec_132_2023_reforma.txt',
    title: 'EC 132/2023 - Reforma Tributária',
    type: 'LEGISLATION',
    legislationType: 'REFORMA_2026',
    tags: ['reforma', 'ibs', 'cbs', 'is', '2026', 'emenda-constitucional'],
  },
  {
    file: 'lc_116_03_iss.txt',
    title: 'LC 116/03 - ISS',
    type: 'LEGISLATION',
    legislationType: 'ISS',
    tags: ['iss', 'serviços', 'municipal', 'lc-116'],
  },
  {
    file: 'manual_sped_fiscal.txt',
    title: 'Manual SPED Fiscal (EFD ICMS/IPI)',
    type: 'MANUAL',
    legislationType: 'SPED',
    tags: ['sped', 'efd', 'icms', 'ipi', 'escrituração-digital'],
  },
  {
    file: 'manual_cte_4.txt',
    title: 'Manual CTe 4.0',
    type: 'MANUAL',
    legislationType: 'CTE',
    tags: ['cte', 'transporte', 'documento-fiscal', 'modelo-57'],
  },
  {
    file: 'manual_nfe_4.txt',
    title: 'Manual NFe 4.0',
    type: 'MANUAL',
    legislationType: 'NFE',
    tags: ['nfe', 'nota-fiscal', 'modelo-55', 'danfe'],
  },
  {
    file: 'lei_13103_15_motorista.txt',
    title: 'Lei do Motorista - Lei 13.103/2015',
    type: 'LEGISLATION',
    legislationType: 'TRABALHISTA',
    tags: ['motorista', 'jornada', 'descanso', 'transporte', 'clt'],
  },
];

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('');
  console.log('🚀 Indexação de Legislação Fiscal Brasileira');
  console.log('═'.repeat(50));
  console.log('');

  // 1. Verificar/criar diretório de legislação
  if (!fs.existsSync(LEGISLATION_DIR)) {
    fs.mkdirSync(LEGISLATION_DIR, { recursive: true });
    console.log(`📁 Diretório criado: ${LEGISLATION_DIR}`);
  }

  // 2. Criar arquivo de exemplo se diretório estiver vazio
  const files = fs.readdirSync(LEGISLATION_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
  
  if (files.length === 0) {
    createSampleFiles();
    console.log('');
    console.log('📝 Arquivos de exemplo criados!');
    console.log('   Adicione mais arquivos de legislação e execute novamente.');
    console.log('');
  }

  // 3. Inicializar vector store e use case
  const vectorStore = new JsonVectorStore(VECTOR_STORE_PATH);
  const indexUseCase = new IndexDocumentUseCase(vectorStore);

  // 4. Estatísticas
  let indexed = 0;
  let skipped = 0;
  let errors = 0;

  // 5. Indexar cada arquivo
  for (const leg of LEGISLATION_FILES) {
    const filePath = path.join(LEGISLATION_DIR, leg.file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  Não encontrado: ${leg.file}`);
      skipped++;
      continue;
    }

    console.log(`📄 Indexando: ${leg.title}...`);

    const result = await indexUseCase.execute({
      filePath,
      title: leg.title,
      type: leg.type,
      legislationType: leg.legislationType,
      source: filePath,
      tags: leg.tags,
    });

    if (Result.isFail(result)) {
      console.log(`   ❌ Erro: ${result.error}`);
      errors++;
    } else {
      console.log(`   ✅ ${result.value.chunksCreated} chunks | ${result.value.estimatedTokens} tokens`);
      indexed++;
    }
  }

  // 6. Mostrar estatísticas do vector store
  const stats = vectorStore.getStats();

  console.log('');
  console.log('📊 Resumo:');
  console.log('─'.repeat(50));
  console.log(`   ✅ Indexados: ${indexed}`);
  console.log(`   ⏭️  Pulados: ${skipped}`);
  console.log(`   ❌ Erros: ${errors}`);
  console.log('');
  console.log('📦 Vector Store:');
  console.log(`   Documentos: ${stats.documentCount}`);
  console.log(`   Chunks: ${stats.chunkCount}`);
  console.log(`   Atualizado: ${stats.lastUpdated}`);
  console.log(`   Arquivo: ${VECTOR_STORE_PATH}`);
  console.log('');
  console.log('✨ Indexação concluída!');
  console.log('');
  console.log('💡 Use o MCP tool search_legislation para consultar a legislação.');
  console.log('');
}

/**
 * Cria arquivos de exemplo para demonstração
 */
function createSampleFiles(): void {
  const samples: Record<string, string> = {
    'lei_kandir_lc87_96.txt': `LEI COMPLEMENTAR Nº 87, DE 13 DE SETEMBRO DE 1996
Lei Kandir - ICMS

Dispõe sobre o imposto dos Estados e do Distrito Federal sobre operações relativas à circulação de mercadorias e sobre prestações de serviços de transporte interestadual e intermunicipal e de comunicação, e dá outras providências.

Art. 1º Compete aos Estados e ao Distrito Federal instituir o imposto sobre operações relativas à circulação de mercadorias e sobre prestações de serviços de transporte interestadual e intermunicipal e de comunicação, ainda que as operações e as prestações se iniciem no exterior.

Art. 2º O imposto incide sobre:
I - operações relativas à circulação de mercadorias, inclusive o fornecimento de alimentação e bebidas em bares, restaurantes e estabelecimentos similares;
II - prestações de serviços de transporte interestadual e intermunicipal, por qualquer via, de pessoas, bens, mercadorias ou valores;
III - prestações onerosas de serviços de comunicação, por qualquer meio, inclusive a geração, a emissão, a recepção, a transmissão, a retransmissão, a repetição e a ampliação de comunicação de qualquer natureza;
IV - fornecimento de mercadorias com prestação de serviços não compreendidos na competência tributária dos Municípios.

Art. 12. Considera-se ocorrido o fato gerador do imposto no momento:
I - da saída de mercadoria de estabelecimento de contribuinte, ainda que para outro estabelecimento do mesmo titular;
II - do fornecimento de alimentação, bebidas e outras mercadorias por qualquer estabelecimento;
III - da transmissão a terceiro de mercadoria depositada em armazém geral ou em depósito fechado.

ALÍQUOTAS INTERESTADUAIS:
- 12% para operações interestaduais em geral
- 7% para operações destinadas às regiões Norte, Nordeste e Centro-Oeste e ao Estado do Espírito Santo
- 4% para produtos importados (Resolução SF 13/2012)

SUBSTITUIÇÃO TRIBUTÁRIA (ST):
O regime de substituição tributária atribui ao contribuinte substituto a responsabilidade pelo recolhimento do ICMS relativo às operações subsequentes.
`,

    'ec_132_2023_reforma.txt': `EMENDA CONSTITUCIONAL Nº 132, DE 20 DE DEZEMBRO DE 2023
Reforma Tributária do Consumo

Altera o Sistema Tributário Nacional.

PRINCIPAIS MUDANÇAS:

1. CRIAÇÃO DO IBS (Imposto sobre Bens e Serviços)
   - Competência compartilhada entre Estados, DF e Municípios
   - Substitui o ICMS e o ISS
   - Não cumulativo
   - Princípio do destino

2. CRIAÇÃO DA CBS (Contribuição sobre Bens e Serviços)
   - Competência da União
   - Substitui PIS e COFINS
   - Não cumulativa
   - Princípio do destino

3. IMPOSTO SELETIVO (IS)
   - Incide sobre produtos prejudiciais à saúde ou ao meio ambiente
   - Cigarros, bebidas alcoólicas, veículos poluentes
   - Não incide sobre energia elétrica e telecomunicações

4. PERÍODO DE TRANSIÇÃO (2026-2033)
   - 2026: Início da cobrança teste (alíquota 0,9% CBS + 0,1% IBS)
   - 2027-2028: Continuidade da transição
   - 2029-2032: Extinção gradual do ICMS e ISS
   - 2033: Plena vigência do novo sistema

5. CASHBACK
   - Devolução de impostos para população de baixa renda
   - Incide sobre consumo essencial (alimentação, energia, gás)

ALÍQUOTA DE REFERÊNCIA:
   - Estimada em 26,5% (IBS + CBS)
   - Pode variar conforme setor (alíquotas reduzidas para alguns serviços)
`,

    'lei_13103_15_motorista.txt': `LEI Nº 13.103, DE 2 DE MARÇO DE 2015
Lei do Motorista Profissional

Dispõe sobre o exercício da profissão de motorista.

JORNADA DE TRABALHO:

Art. 235-C. A jornada diária de trabalho do motorista profissional será de 8 horas, admitindo-se a sua prorrogação por até 2 horas extraordinárias.

TEMPO DE DIREÇÃO:

Art. 235-D. Nas viagens de longa distância, o motorista profissional:
- Tempo máximo de direção: 5 horas e 30 minutos contínuas
- Intervalo mínimo: 30 minutos para descanso
- Tempo máximo em 24 horas: 10 horas (prorrogáveis para 12h em situações excepcionais)

DESCANSO:

Art. 235-E. O motorista profissional terá:
- Descanso diário: 11 horas a cada 24 horas, podendo ser fracionado
- Descanso semanal: 35 horas consecutivas

ESPERA:

Art. 235-F. O tempo de espera:
- Não é computado como tempo de direção ou jornada
- Deve ser remunerado à razão de 30% do salário-hora

CONTROLE DE JORNADA:

Art. 2º, § 5º: Obrigatório o uso de tacógrafo ou sistema eletrônico de rastreamento.
`,
  };

  for (const [filename, content] of Object.entries(samples)) {
    const filePath = path.join(LEGISLATION_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`   📄 Criado: ${filename}`);
  }
}

// Executar
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
