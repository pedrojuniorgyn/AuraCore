/**
 * Process Document Tool
 * =====================
 *
 * MCP Tool para processamento de documentos PDF via Docling.
 * Suporta DANFe, DACTe, Contratos de Frete, Extratos Bancários e documentos genéricos.
 *
 * @module mcp-server/tools/process-document
 * @see E-Agent-Fase-D7, D6 (BankStatementParser)
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type {
  ProcessDocumentInput,
  ProcessDocumentOutput,
  DocumentType,
  DANFeOutputData,
  DACTeOutputData,
  FreightContractOutputData,
  GenericOutputData,
  BankStatementOutputData,
} from '../contracts/process-document.contract.js';

import {
  validateProcessDocumentInput,
  createErrorOutput,
  createSuccessOutput,
} from '../contracts/process-document.contract.js';

// D6 Integration - Bank Statement Parser (local implementation for MCP)
import { parseBankStatement as parseStatementContent } from '../parsers/bank-statement-parser.js';

// ============================================================================
// TYPES (Internal)
// ============================================================================

/**
 * Resultado de extração do Docling (mock/interface).
 * Em produção, isso viria do DoclingClient real.
 */
interface DoclingExtractionResult {
  text: string;
  tables: Array<{
    index: number;
    headers: string[];
    rows: string[][];
    pageNumber: number;
  }>;
  metadata: {
    pageCount: number;
    title?: string;
    author?: string;
    fileSize: number;
  };
  processingTimeMs: number;
}

/**
 * Interface para injeção de dependência do DoclingClient.
 * Permite testes sem Docker.
 */
export interface IDoclingClient {
  processDocument(filePath: string): Promise<DoclingClientResult<DoclingExtractionResult>>;
  healthCheck(): Promise<DoclingClientResult<{ status: string }>>;
}

interface DoclingClientResult<T> {
  success: boolean;
  value?: T;
  error?: string;
}

// ============================================================================
// DEFAULT DOCLING CLIENT (MOCK para testes)
// ============================================================================

/**
 * Cliente Docling mockado para testes.
 * Em produção, usar DoclingClient real via DI.
 */
class MockDoclingClient implements IDoclingClient {
  async processDocument(filePath: string): Promise<DoclingClientResult<DoclingExtractionResult>> {
    // Simular falha se arquivo não existe
    if (filePath.includes('not_found') || filePath.includes('inexistente')) {
      return {
        success: false,
        error: `File not found: ${filePath}`,
      };
    }

    // Simular timeout
    if (filePath.includes('timeout')) {
      return {
        success: false,
        error: 'Timeout após 60000ms',
      };
    }

    // Retornar resultado mockado
    return {
      success: true,
      value: {
        text: 'Documento processado com sucesso',
        tables: [],
        metadata: {
          pageCount: 1,
          fileSize: 1024,
        },
        processingTimeMs: 100,
      },
    };
  }

  async healthCheck(): Promise<DoclingClientResult<{ status: string }>> {
    return {
      success: true,
      value: { status: 'healthy' },
    };
  }
}

// Cliente global (pode ser substituído para testes)
let doclingClient: IDoclingClient = new MockDoclingClient();

/**
 * Permite injetar cliente Docling customizado (para testes).
 */
export function setDoclingClient(client: IDoclingClient): void {
  doclingClient = client;
}

/**
 * Reseta para cliente mock padrão.
 */
export function resetDoclingClient(): void {
  doclingClient = new MockDoclingClient();
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Processa documento PDF e retorna dados estruturados.
 *
 * @param input - Parâmetros de entrada
 * @returns Dados estruturados do documento
 */
export async function processDocument(
  input: ProcessDocumentInput
): Promise<ProcessDocumentOutput> {
  const startTime = Date.now();

  // 1. Validar input
  const validationErrors = validateProcessDocumentInput(input);
  if (validationErrors.length > 0) {
    return createErrorOutput(
      input.document_type ?? 'generic',
      validationErrors,
      Date.now() - startTime
    );
  }

  // 2. Caminho especial para bank_statement (não usa Docling - lê arquivo diretamente)
  if (input.document_type === 'bank_statement') {
    return processBankStatement(input, startTime);
  }

  // 3. Determinar caminho do arquivo (para documentos via Docling)
  const filePath = resolveFilePath(input);
  if (!filePath) {
    return createErrorOutput(
      input.document_type,
      ['Could not resolve file path'],
      Date.now() - startTime
    );
  }

  // 4. Processar documento via Docling
  const extractionResult = await doclingClient.processDocument(filePath);
  
  if (!extractionResult.success || !extractionResult.value) {
    return createErrorOutput(
      input.document_type,
      [extractionResult.error ?? 'Unknown error during document processing'],
      Date.now() - startTime
    );
  }

  const extraction = extractionResult.value;

  // 5. Rotear para parser específico baseado no tipo
  try {
    const result = await routeToParser(
      input.document_type,
      extraction,
      input.file_name
    );

    return createSuccessOutput(
      input.document_type,
      result.data,
      Date.now() - startTime,
      result.warnings
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorOutput(
      input.document_type,
      [`Error parsing document: ${errorMessage}`],
      Date.now() - startTime
    );
  }
}

/**
 * Processa extrato bancário (OFX/CSV) usando BankStatementParser do D6.
 * Não usa Docling - lê conteúdo diretamente do arquivo.
 */
async function processBankStatement(
  input: ProcessDocumentInput,
  startTime: number
): Promise<ProcessDocumentOutput> {
  try {
    // 1. Verificar formato suportado
    const fileName = input.file_name.toLowerCase();
    const isOFX = fileName.endsWith('.ofx') || fileName.endsWith('.qfx');
    const isCSV = fileName.endsWith('.csv') || fileName.endsWith('.txt');

    if (!isOFX && !isCSV) {
      return createErrorOutput(
        'bank_statement',
        ['Formato não suportado. Use arquivos .ofx, .qfx, .csv ou .txt'],
        Date.now() - startTime
      );
    }

    // 2. Ler conteúdo do arquivo
    let content: string;
    
    if (input.file_base64) {
      // Decodificar base64
      content = Buffer.from(input.file_base64, 'base64').toString('utf-8');
    } else if (input.file_path) {
      // Ler do sistema de arquivos
      try {
        content = await fs.readFile(input.file_path, 'utf-8');
      } catch (fsError: unknown) {
        const errorMsg = fsError instanceof Error ? fsError.message : String(fsError);
        return createErrorOutput(
          'bank_statement',
          [`Erro ao ler arquivo: ${errorMsg}`],
          Date.now() - startTime
        );
      }
    } else {
      return createErrorOutput(
        'bank_statement',
        ['Nenhum conteúdo de arquivo fornecido (file_path ou file_base64)'],
        Date.now() - startTime
      );
    }

    if (!content || content.trim() === '') {
      return createErrorOutput(
        'bank_statement',
        ['Arquivo vazio ou sem conteúdo válido'],
        Date.now() - startTime
      );
    }

    // 3. Fazer parse usando parser local do MCP (baseado em D6)
    const parseResult = parseStatementContent(content, input.file_name);

    if (!parseResult.success || !parseResult.statement) {
      return createErrorOutput(
        'bank_statement',
        [parseResult.error ?? 'Erro desconhecido ao processar extrato'],
        Date.now() - startTime
      );
    }

    const { statement, parserUsed } = parseResult;

    // 4. Mapear para output do MCP
    const bankStatementData: BankStatementOutputData = {
      account: {
        bankCode: statement.account.bankCode,
        bankName: statement.account.bankName,
        branchCode: statement.account.branchCode,
        accountNumber: statement.account.accountNumber,
        accountType: statement.account.accountType,
        currency: statement.account.currency,
      },
      period: {
        start: statement.period.startDate.toISOString().split('T')[0],
        end: statement.period.endDate.toISOString().split('T')[0],
        generatedAt: statement.period.generatedAt?.toISOString(),
      },
      balance: {
        opening: statement.balance.openingBalance,
        closing: statement.balance.closingBalance,
        available: statement.balance.availableBalance,
      },
      statistics: {
        transactionCount: statement.summary.totalTransactions,
        creditCount: statement.summary.creditCount,
        debitCount: statement.summary.debitCount,
        totalCredits: statement.summary.totalCredits,
        totalDebits: statement.summary.totalDebits,
        netMovement: statement.summary.netMovement,
        averageAmount: statement.summary.averageTransactionAmount,
      },
      transactions: statement.transactions.map(txn => ({
        fitId: txn.fitId,
        date: txn.transactionDate.toISOString().split('T')[0],
        postDate: txn.postDate?.toISOString().split('T')[0],
        description: txn.description,
        normalizedDescription: txn.normalizedDescription,
        amount: txn.amount,
        type: txn.direction,
        transactionType: txn.type,
        category: txn.category,
        categoryConfidence: txn.categoryConfidence,
        payee: txn.payee,
      })),
      validation: {
        isValid: statement.isValid,
        errors: statement.validationErrors,
        warnings: statement.validationWarnings,
      },
      parserUsed: parserUsed ?? 'OFX',
      format: statement.format,
    };

    return createSuccessOutput(
      'bank_statement',
      { bank_statement: bankStatementData },
      Date.now() - startTime,
      statement.validationWarnings.length > 0 ? statement.validationWarnings : undefined
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return createErrorOutput(
      'bank_statement',
      [`Erro ao processar extrato bancário: ${errorMessage}`],
      Date.now() - startTime
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Resolve o caminho do arquivo a partir do input.
 */
function resolveFilePath(input: ProcessDocumentInput): string | null {
  // Prioridade: file_path > file_base64 (convertido)
  if (input.file_path) {
    return input.file_path;
  }

  if (input.file_base64) {
    // Em produção, salvaria em temp e retornaria path
    // Para testes, retornar path mockado
    return `/tmp/uploads/${input.file_name}`;
  }

  return null;
}

/**
 * Roteia extração para parser específico.
 */
async function routeToParser(
  documentType: DocumentType,
  extraction: DoclingExtractionResult,
  fileName: string
): Promise<{ data: ProcessDocumentOutput['data']; warnings?: string[] }> {
  const warnings: string[] = [];

  switch (documentType) {
    case 'danfe':
      return parseDANFe(extraction, warnings);

    case 'dacte':
      return parseDACTe(extraction, warnings);

    case 'freight_contract':
      return parseFreightContract(extraction, fileName, warnings);

    case 'bank_statement':
      // Nota: bank_statement é processado diretamente em processBankStatement()
      // Este case não deve ser alcançado, mas mantemos por segurança
      return parseGeneric(extraction, warnings);

    case 'generic':
    default:
      return parseGeneric(extraction, warnings);
  }
}

// ============================================================================
// PARSERS
// ============================================================================

/**
 * Parser para DANFe.
 * Em produção, delegaria para DANFeParser real.
 */
function parseDANFe(
  extraction: DoclingExtractionResult,
  warnings: string[]
): { data: ProcessDocumentOutput['data']; warnings?: string[] } {
  // Extrair chave de acesso (44 dígitos)
  const chaveMatch = extraction.text.match(/\d{44}/);
  const chaveAcesso = chaveMatch?.[0] ?? '';

  if (!chaveAcesso) {
    warnings.push('Chave de acesso não encontrada');
  }

  // Extrair número e série da chave
  let numero = 0;
  let serie = 0;
  if (chaveAcesso.length === 44) {
    serie = parseInt(chaveAcesso.substring(22, 25), 10) || 0;
    numero = parseInt(chaveAcesso.substring(25, 34), 10) || 0;
  }

  // Extrair CNPJs
  const cnpjs = extraction.text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) ?? [];
  const cnpjEmitente = cnpjs[0]?.replace(/\D/g, '') ?? '';
  const cnpjDestinatario = cnpjs[1]?.replace(/\D/g, '') ?? '';

  // Extrair valores
  const valores = extraction.text.match(/R\$\s*[\d.,]+/g) ?? [];
  const valorTotal = parseMoneyValue(valores[valores.length - 1] ?? 'R$ 0,00');

  const danfeData: DANFeOutputData = {
    chaveAcesso,
    numero,
    serie,
    dataEmissao: new Date().toISOString(),
    emitente: {
      cnpj: cnpjEmitente,
      razaoSocial: 'Emitente Extraído',
      inscricaoEstadual: '',
      uf: chaveAcesso.substring(0, 2) || 'SP',
    },
    destinatario: {
      cnpjCpf: cnpjDestinatario,
      razaoSocial: 'Destinatário Extraído',
      uf: 'SP',
    },
    produtos: extractProducts(extraction.tables),
    totais: {
      valorProdutos: valorTotal,
      valorFrete: 0,
      valorTotal,
    },
  };

  return {
    data: { danfe: danfeData },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Parser para DACTe.
 * Em produção, delegaria para DACTeParser real.
 */
function parseDACTe(
  extraction: DoclingExtractionResult,
  warnings: string[]
): { data: ProcessDocumentOutput['data']; warnings?: string[] } {
  // Extrair chave CTe (44 dígitos, modelo 57)
  const chaves = extraction.text.match(/\d{44}/g) ?? [];
  // Chave CTe começa com UF + AAMM + 57 (modelo)
  const chaveCTe = chaves.find(c => c.substring(20, 22) === '57') ?? chaves[0] ?? '';

  if (!chaveCTe) {
    warnings.push('Chave CTe não encontrada');
  }

  // Extrair número e série da chave
  let numero = 0;
  let serie = 0;
  if (chaveCTe.length === 44) {
    serie = parseInt(chaveCTe.substring(22, 25), 10) || 0;
    numero = parseInt(chaveCTe.substring(25, 34), 10) || 0;
  }

  // Extrair CNPJs
  const cnpjs = extraction.text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) ?? [];
  
  // Extrair CFOP
  const cfopMatch = extraction.text.match(/(?:CFOP|cfop)[:\s]*(\d{4})/i);
  const cfop = cfopMatch?.[1] ?? '5353';

  // Extrair modal
  let modal = 'RODOVIARIO';
  const lowerText = extraction.text.toLowerCase();
  if (lowerText.includes('aéreo') || lowerText.includes('aereo')) modal = 'AEREO';
  else if (lowerText.includes('aqua') || lowerText.includes('marit')) modal = 'AQUAVIARIO';
  else if (lowerText.includes('ferro')) modal = 'FERROVIARIO';

  // Extrair valores
  const valores = extraction.text.match(/R\$\s*[\d.,]+/g) ?? [];
  const valorServico = parseMoneyValue(valores[0] ?? 'R$ 0,00');
  const valorCarga = parseMoneyValue(valores[1] ?? 'R$ 0,00');

  // Extrair documentos (NFes transportadas)
  const nfes = extraction.text.match(/\d{44}/g)?.filter(c => c.substring(20, 22) === '55') ?? [];

  const dacteData: DACTeOutputData = {
    chaveCTe,
    numero,
    serie,
    dataEmissao: new Date().toISOString(),
    cfop,
    modal,
    tipoServico: 'NORMAL',
    emitente: {
      cnpjCpf: cnpjs[0]?.replace(/\D/g, '') ?? '',
      razaoSocial: 'Transportadora',
      uf: chaveCTe.substring(0, 2) || 'SP',
    },
    remetente: {
      cnpjCpf: cnpjs[1]?.replace(/\D/g, '') ?? '',
      razaoSocial: 'Remetente',
      uf: 'SP',
    },
    destinatario: {
      cnpjCpf: cnpjs[2]?.replace(/\D/g, '') ?? '',
      razaoSocial: 'Destinatário',
      uf: 'SP',
    },
    valores: {
      valorServico,
      valorCarga,
    },
    documentos: nfes.map(chave => ({
      tipo: 'NFE',
      chaveNFe: chave,
    })),
  };

  return {
    data: { dacte: dacteData },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Parser para Contrato de Frete.
 * Em produção, delegaria para FreightContractParser real.
 */
function parseFreightContract(
  extraction: DoclingExtractionResult,
  fileName: string,
  warnings: string[]
): { data: ProcessDocumentOutput['data']; warnings?: string[] } {
  const lowerText = extraction.text.toLowerCase();

  // Detectar tipo de contrato
  let contractType = 'OUTROS';
  if (lowerText.includes('frete spot') || lowerText.includes('frete avulso')) {
    contractType = 'FRETE_SPOT';
  } else if (lowerText.includes('dedicado') || lowerText.includes('exclusividade')) {
    contractType = 'FRETE_DEDICADO';
  } else if (lowerText.includes('agregamento') || lowerText.includes('agregado')) {
    contractType = 'AGREGAMENTO';
  } else if (lowerText.includes('subcontrat')) {
    contractType = 'SUBCONTRATACAO';
  }

  // Extrair número do contrato
  const contractNumberMatch = extraction.text.match(/contrato\s*(?:n[º°]?|número)?\s*[:.]?\s*(\d+[\d\-\/\.]*)/i);
  const contractNumber = contractNumberMatch?.[1];

  // Extrair CNPJs
  const cnpjs = extraction.text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g) ?? [];

  // Extrair valores
  const valores = extraction.text.match(/R\$\s*[\d.,]+/g) ?? [];
  const firstValue = valores[0];
  const baseValue = firstValue !== undefined ? parseMoneyValue(firstValue) : undefined;

  // Extrair prazo de pagamento
  const paymentMatch = extraction.text.match(/pagamento\s*(?:em|de|:)?\s*(\d+)\s*dias?/i);
  const dueDays = paymentMatch ? parseInt(paymentMatch[1], 10) : 30;

  // Determinar tipo de precificação
  let pricingType = 'FIXO';
  if (lowerText.includes('por km') || lowerText.includes('/km')) pricingType = 'POR_KM';
  else if (lowerText.includes('por kg') || lowerText.includes('por peso')) pricingType = 'POR_PESO';
  else if (lowerText.includes('tabela')) pricingType = 'TABELA';

  // Calcular confiança baseada em dados extraídos
  let confidence = 0.5;
  if (cnpjs.length >= 2) confidence += 0.2;
  if (contractNumber) confidence += 0.1;
  if (valores.length > 0) confidence += 0.1;
  if (extraction.tables.length > 0) confidence += 0.1;

  const contractData: FreightContractOutputData = {
    id: globalThis.crypto.randomUUID(),
    fileName,
    contractType,
    contractNumber,
    parties: {
      contractor: {
        name: 'Contratante',
        document: cnpjs[0]?.replace(/\D/g, '') ?? '',
        documentType: 'CNPJ',
      },
      contracted: {
        name: 'Contratado',
        document: cnpjs[1]?.replace(/\D/g, '') ?? '',
        documentType: 'CNPJ',
      },
    },
    financial: {
      pricingType,
      baseValue,
      currency: 'BRL',
      dueDays,
    },
    confidence: Math.min(confidence, 1),
  };

  if (cnpjs.length < 2) {
    warnings.push('Menos de 2 CNPJs encontrados');
  }

  return {
    data: { freight_contract: contractData },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// Note: parseBankStatement was replaced by processBankStatement() which uses D6 BankStatementParser directly

/**
 * Parser genérico - retorna texto e tabelas raw.
 */
function parseGeneric(
  extraction: DoclingExtractionResult,
  warnings: string[]
): { data: ProcessDocumentOutput['data']; warnings?: string[] } {
  const genericData: GenericOutputData = {
    text: extraction.text,
    tables: extraction.tables.map(t => ({
      headers: t.headers,
      rows: t.rows,
    })),
    metadata: {
      pageCount: extraction.metadata.pageCount,
      title: extraction.metadata.title,
      fileSize: extraction.metadata.fileSize,
    },
  };

  return {
    data: { generic: genericData },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Converte string de valor monetário para número.
 */
function parseMoneyValue(value: string): number {
  // Remove "R$", espaços, e pontos de milhar; troca vírgula por ponto
  const cleaned = value
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  
  return parseFloat(cleaned) || 0;
}

/**
 * Extrai produtos de tabelas.
 */
function extractProducts(
  tables: DoclingExtractionResult['tables']
): DANFeOutputData['produtos'] {
  const produtos: DANFeOutputData['produtos'] = [];

  for (const table of tables) {
    // Procurar tabela de produtos (tem colunas como Código, Descrição, etc)
    const headers = table.headers.map(h => h.toLowerCase());
    const hasProductTable = headers.some(h => 
      h.includes('código') || h.includes('codigo') || h.includes('descri')
    );

    if (hasProductTable) {
      for (const row of table.rows) {
        if (row.length >= 3) {
          produtos.push({
            codigo: row[0] ?? '',
            descricao: row[1] ?? '',
            ncm: row[2] ?? '',
            quantidade: parseFloat(row[3]?.replace(',', '.') ?? '0') || 0,
            valorTotal: parseMoneyValue(row[row.length - 1] ?? '0'),
          });
        }
      }
    }
  }

  return produtos;
}
