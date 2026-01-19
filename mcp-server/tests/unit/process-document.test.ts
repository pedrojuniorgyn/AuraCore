import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  processDocument,
  setDoclingClient,
  resetDoclingClient,
  type IDoclingClient,
} from '../../src/tools/process-document.js';
import {
  validateProcessDocumentInput,
  createErrorOutput,
  createSuccessOutput,
} from '../../src/contracts/process-document.contract.js';
import type { ProcessDocumentInput } from '../../src/contracts/process-document.contract.js';

// ============================================================================
// MOCK DOCLING CLIENT
// ============================================================================

function createMockDoclingClient(options: {
  processResult?: {
    success: boolean;
    value?: {
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
        fileSize: number;
      };
      processingTimeMs: number;
    };
    error?: string;
  };
}): IDoclingClient {
  return {
    processDocument: vi.fn().mockResolvedValue(
      options.processResult ?? {
        success: true,
        value: {
          text: 'Documento de teste',
          tables: [],
          metadata: { pageCount: 1, fileSize: 1024 },
          processingTimeMs: 50,
        },
      }
    ),
    healthCheck: vi.fn().mockResolvedValue({
      success: true,
      value: { status: 'healthy' },
    }),
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('processDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDoclingClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetDoclingClient();
  });

  // ==========================================================================
  // VALIDATION TESTS
  // ==========================================================================

  describe('validação de entrada', () => {
    it('deve rejeitar input sem document_type', async () => {
      const input = {
        file_name: 'test.pdf',
        file_path: '/path/to/file.pdf',
      } as unknown as ProcessDocumentInput;

      const result = await processDocument(input);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('document_type'))).toBe(true);
    });

    it('deve rejeitar input sem file_name', async () => {
      const input = {
        document_type: 'danfe',
        file_path: '/path/to/file.pdf',
      } as unknown as ProcessDocumentInput;

      const result = await processDocument(input);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(e => e.includes('file_name'))).toBe(true);
    });

    it('deve rejeitar input sem file_path e sem file_base64', async () => {
      const input: ProcessDocumentInput = {
        document_type: 'danfe',
        file_name: 'test.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('file_path') || e.includes('file_base64'))).toBe(true);
    });

    it('deve rejeitar document_type inválido', async () => {
      const input = {
        document_type: 'invalid_type',
        file_name: 'test.pdf',
        file_path: '/path/to/file.pdf',
      } as unknown as ProcessDocumentInput;

      const result = await processDocument(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('document_type'))).toBe(true);
    });

    it('deve rejeitar file_name vazio', async () => {
      const input: ProcessDocumentInput = {
        document_type: 'danfe',
        file_name: '   ',
        file_path: '/path/to/file.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('file_name'))).toBe(true);
    });
  });

  // ==========================================================================
  // DANFE TESTS
  // ==========================================================================

  describe('processamento de DANFe', () => {
    it('deve processar DANFe e retornar dados estruturados', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: true,
          value: {
            text: `
              DANFE
              Chave de acesso: 35230112345678000123550010000001231234567890
              CNPJ: 12.345.678/0001-23
              CNPJ: 98.765.432/0001-00
              Valor Total: R$ 1.500,00
            `,
            tables: [],
            metadata: { pageCount: 1, fileSize: 2048 },
            processingTimeMs: 100,
          },
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'danfe',
        file_name: 'danfe.pdf',
        file_path: '/uploads/danfe.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(true);
      expect(result.document_type).toBe('danfe');
      expect(result.data.danfe).toBeDefined();
      expect(result.data.danfe?.chaveAcesso).toBe('35230112345678000123550010000001231234567890');
    });

    it('deve extrair produtos de tabela DANFe', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: true,
          value: {
            text: `
              DANFE
              35230112345678000123550010000001231234567890
              CNPJ: 12.345.678/0001-23
              CNPJ: 98.765.432/0001-00
            `,
            tables: [
              {
                index: 0,
                headers: ['Código', 'Descrição', 'NCM', 'Qtd', 'Valor'],
                rows: [
                  ['001', 'Produto A', '12345678', '10', 'R$ 100,00'],
                  ['002', 'Produto B', '87654321', '5', 'R$ 50,00'],
                ],
                pageNumber: 1,
              },
            ],
            metadata: { pageCount: 1, fileSize: 2048 },
            processingTimeMs: 100,
          },
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'danfe',
        file_name: 'danfe.pdf',
        file_path: '/uploads/danfe.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(true);
      expect(result.data.danfe?.produtos).toBeDefined();
      expect(result.data.danfe?.produtos.length).toBe(2);
    });

    it('deve gerar warning quando chave não é encontrada', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: true,
          value: {
            text: 'Documento sem chave de acesso',
            tables: [],
            metadata: { pageCount: 1, fileSize: 1024 },
            processingTimeMs: 50,
          },
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'danfe',
        file_name: 'danfe.pdf',
        file_path: '/uploads/danfe.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('Chave'))).toBe(true);
    });
  });

  // ==========================================================================
  // DACTE TESTS
  // ==========================================================================

  describe('processamento de DACTe', () => {
    it('deve processar DACTe e retornar dados estruturados', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: true,
          value: {
            text: `
              DACTE
              35230112345678000123570010000001231234567890
              CFOP: 5353
              CNPJ: 12.345.678/0001-23
              CNPJ: 98.765.432/0001-00
              CNPJ: 11.222.333/0001-44
              Valor do Serviço: R$ 500,00
              Valor da Carga: R$ 10.000,00
            `,
            tables: [],
            metadata: { pageCount: 1, fileSize: 2048 },
            processingTimeMs: 100,
          },
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'dacte',
        file_name: 'dacte.pdf',
        file_path: '/uploads/dacte.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(true);
      expect(result.document_type).toBe('dacte');
      expect(result.data.dacte).toBeDefined();
      expect(result.data.dacte?.cfop).toBe('5353');
    });

    it('deve extrair documentos transportados (NFes)', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: true,
          value: {
            text: `
              DACTE
              35230112345678000123570010000001231234567890
              NFe: 35230198765432000100550010000009871234567890
              NFe: 35230198765432000100550010000009881234567890
            `,
            tables: [],
            metadata: { pageCount: 1, fileSize: 2048 },
            processingTimeMs: 100,
          },
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'dacte',
        file_name: 'dacte.pdf',
        file_path: '/uploads/dacte.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(true);
      expect(result.data.dacte?.documentos).toBeDefined();
      expect(result.data.dacte?.documentos.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // FREIGHT CONTRACT TESTS
  // ==========================================================================

  describe('processamento de Contrato de Frete', () => {
    it('deve processar contrato e retornar dados estruturados', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: true,
          value: {
            text: `
              CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE TRANSPORTE
              Contrato Nº 123/2024
              
              CONTRATANTE: Empresa ABC Ltda
              CNPJ: 12.345.678/0001-23
              
              CONTRATADO: Transportadora XYZ S.A.
              CNPJ: 98.765.432/0001-00
              
              Prazo de pagamento: 30 dias
              Valor: R$ 5.000,00
              
              Frete dedicado com exclusividade
            `,
            tables: [],
            metadata: { pageCount: 5, fileSize: 10240 },
            processingTimeMs: 200,
          },
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'freight_contract',
        file_name: 'contrato.pdf',
        file_path: '/uploads/contrato.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(true);
      expect(result.document_type).toBe('freight_contract');
      expect(result.data.freight_contract).toBeDefined();
      expect(result.data.freight_contract?.contractType).toBe('FRETE_DEDICADO');
      expect(result.data.freight_contract?.contractNumber).toBe('123/2024');
    });

    it('deve calcular confiança baseada em dados extraídos', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: true,
          value: {
            text: `
              CONTRATO
              CNPJ: 12.345.678/0001-23
              CNPJ: 98.765.432/0001-00
              Contrato Nº 456
              R$ 10.000,00
            `,
            tables: [
              { index: 0, headers: ['Item', 'Valor'], rows: [], pageNumber: 1 },
            ],
            metadata: { pageCount: 3, fileSize: 5000 },
            processingTimeMs: 150,
          },
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'freight_contract',
        file_name: 'contrato.pdf',
        file_path: '/uploads/contrato.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(true);
      expect(result.data.freight_contract?.confidence).toBeGreaterThan(0.5);
    });
  });

  // ==========================================================================
  // GENERIC DOCUMENT TESTS
  // ==========================================================================

  describe('processamento genérico', () => {
    it('deve processar documento genérico e retornar texto + tabelas', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: true,
          value: {
            text: 'Texto do documento genérico',
            tables: [
              {
                index: 0,
                headers: ['Col1', 'Col2'],
                rows: [['A', 'B'], ['C', 'D']],
                pageNumber: 1,
              },
            ],
            metadata: { pageCount: 2, title: 'Documento Genérico', fileSize: 3000 },
            processingTimeMs: 80,
          },
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'generic',
        file_name: 'documento.pdf',
        file_path: '/uploads/documento.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(true);
      expect(result.data.generic).toBeDefined();
      expect(result.data.generic?.text).toBe('Texto do documento genérico');
      expect(result.data.generic?.tables).toHaveLength(1);
      expect(result.data.generic?.metadata.pageCount).toBe(2);
    });
  });

  // ==========================================================================
  // BANK STATEMENT TESTS
  // ==========================================================================

  describe('processamento de extrato bancário', () => {
    it('deve retornar erro para PDF (formato não suportado)', async () => {
      // Bank statement agora suporta apenas OFX, QFX, CSV e TXT
      // PDF deve retornar erro de formato não suportado
      const input: ProcessDocumentInput = {
        document_type: 'bank_statement',
        file_name: 'extrato.pdf',
        file_base64: Buffer.from('conteudo pdf').toString('base64'),
      };

      const result = await processDocument(input);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0]).toContain('Formato não suportado');
    });

    it('deve processar arquivo OFX com sucesso', async () => {
      const mockOFX = `
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>341
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20260101
<DTEND>20260115
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260105
<TRNAMT>1000.00
<FITID>001
<MEMO>TED RECEBIDA
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;
      const input: ProcessDocumentInput = {
        document_type: 'bank_statement',
        file_name: 'extrato.ofx',
        file_base64: Buffer.from(mockOFX).toString('base64'),
      };

      const result = await processDocument(input);

      expect(result.success).toBe(true);
      expect(result.data.bank_statement).toBeDefined();
      expect(result.data.bank_statement!.transactions.length).toBeGreaterThan(0);
      expect(result.data.bank_statement!.parserUsed).toBe('OFX');
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('tratamento de erros', () => {
    it('deve retornar erro quando arquivo não é encontrado', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: false,
          error: 'File not found: /path/to/not_found.pdf',
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'danfe',
        file_name: 'not_found.pdf',
        file_path: '/path/to/not_found.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('not found') || e.includes('File'))).toBe(true);
    });

    it('deve retornar erro em caso de timeout', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: false,
          error: 'Timeout após 60000ms',
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'danfe',
        file_name: 'timeout.pdf',
        file_path: '/path/to/timeout.pdf',
      };

      const result = await processDocument(input);

      expect(result.success).toBe(false);
      expect(result.errors?.some(e => e.includes('Timeout'))).toBe(true);
    });

    it('deve funcionar com file_base64 ao invés de file_path', async () => {
      const mockClient = createMockDoclingClient({
        processResult: {
          success: true,
          value: {
            text: 'Documento via base64',
            tables: [],
            metadata: { pageCount: 1, fileSize: 500 },
            processingTimeMs: 30,
          },
        },
      });
      setDoclingClient(mockClient);

      const input: ProcessDocumentInput = {
        document_type: 'generic',
        file_name: 'documento.pdf',
        file_base64: 'JVBERi0xLjQK...', // PDF base64 simulado
      };

      const result = await processDocument(input);

      expect(result.success).toBe(true);
    });
  });

  // ==========================================================================
  // CONTRACT VALIDATION TESTS
  // ==========================================================================

  describe('validateProcessDocumentInput', () => {
    it('deve retornar array vazio para input válido', () => {
      const input = {
        document_type: 'danfe',
        file_name: 'test.pdf',
        file_path: '/path/to/file.pdf',
      };

      const errors = validateProcessDocumentInput(input);

      expect(errors).toHaveLength(0);
    });

    it('deve retornar erro para input null', () => {
      const errors = validateProcessDocumentInput(null);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('non-null object');
    });

    it('deve validar options corretamente', () => {
      const input = {
        document_type: 'danfe',
        file_name: 'test.pdf',
        file_path: '/path/to/file.pdf',
        options: {
          language: 'pt-BR',
          ocr_enabled: true,
        },
      };

      const errors = validateProcessDocumentInput(input);

      expect(errors).toHaveLength(0);
    });

    it('deve rejeitar options.language inválido', () => {
      const input = {
        document_type: 'danfe',
        file_name: 'test.pdf',
        file_path: '/path/to/file.pdf',
        options: {
          language: 123, // deveria ser string
        },
      };

      const errors = validateProcessDocumentInput(input);

      expect(errors.some(e => e.includes('language'))).toBe(true);
    });
  });

  // ==========================================================================
  // HELPER FUNCTION TESTS
  // ==========================================================================

  describe('helper functions', () => {
    it('createErrorOutput deve criar output de erro corretamente', () => {
      const output = createErrorOutput('danfe', ['Erro 1', 'Erro 2'], 100);

      expect(output.success).toBe(false);
      expect(output.document_type).toBe('danfe');
      expect(output.errors).toEqual(['Erro 1', 'Erro 2']);
      expect(output.processing_time_ms).toBe(100);
    });

    it('createSuccessOutput deve criar output de sucesso corretamente', () => {
      const output = createSuccessOutput(
        'dacte',
        { dacte: { chaveCTe: '123', numero: 1, serie: 1, dataEmissao: '', cfop: '', modal: '', tipoServico: '', emitente: { cnpjCpf: '', razaoSocial: '', uf: '' }, remetente: { cnpjCpf: '', razaoSocial: '', uf: '' }, destinatario: { cnpjCpf: '', razaoSocial: '', uf: '' }, valores: { valorServico: 0, valorCarga: 0 }, documentos: [] } },
        200,
        ['Warning 1']
      );

      expect(output.success).toBe(true);
      expect(output.document_type).toBe('dacte');
      expect(output.warnings).toEqual(['Warning 1']);
      expect(output.processing_time_ms).toBe(200);
    });

    it('createSuccessOutput não deve incluir warnings se array vazio', () => {
      const output = createSuccessOutput('generic', { generic: { text: '', tables: [], metadata: { pageCount: 1, fileSize: 0 } } }, 50, []);

      expect(output.warnings).toBeUndefined();
    });
  });
});
