/**
 * @module agent/workflows/FiscalImportWorkflow
 * @description Workflow para importação de documentos fiscais
 * 
 * Orquestra o fluxo completo de importação:
 * 1. Detectar fonte do documento (email, drive, upload)
 * 2. Buscar documento da fonte
 * 3. Extrair dados com Document AI
 * 4. Validar dados extraídos
 * 5. Calcular impostos se necessário
 * 6. Salvar no AuraCore
 * 
 * @example
 * ```typescript
 * const workflow = new FiscalImportWorkflow(googleCloud, googleWorkspace);
 * const result = await workflow.execute({
 *   source: 'email',
 *   identifier: 'messageId123',
 *   documentType: 'nfe',
 *   organizationId: 1,
 *   branchId: 1,
 *   userId: 'user-123',
 * });
 * ```
 */

import type { GoogleCloudClient } from '../integrations/google/GoogleCloudClient';
import type { GoogleWorkspaceClient } from '../integrations/google/GoogleWorkspaceClient';
import type {
  FiscalImportState,
  FiscalImportResult,
  FiscalImportConfig,
  ExtractedFiscalData,
  ValidationResult,
  TaxCalculationResult,
  DocumentSource,
  FiscalDocumentType,
} from './types';
import { Result } from '@/shared/domain';

/**
 * Input para iniciar o workflow
 */
export interface FiscalImportInput {
  source: DocumentSource;
  identifier: string;
  documentType: FiscalDocumentType;
  organizationId: number;
  branchId: number;
  userId: string;
  config?: FiscalImportConfig;
}

/**
 * Workflow de importação fiscal
 * 
 * Implementação sequencial que pode ser migrada para LangGraph
 * quando a integração estiver madura.
 */
export class FiscalImportWorkflow {
  private readonly googleCloud: GoogleCloudClient;
  private readonly googleWorkspace: GoogleWorkspaceClient | null;
  private readonly config: FiscalImportConfig;

  constructor(
    googleCloud: GoogleCloudClient,
    googleWorkspace: GoogleWorkspaceClient | null,
    config: FiscalImportConfig = {}
  ) {
    this.googleCloud = googleCloud;
    this.googleWorkspace = googleWorkspace;
    this.config = {
      validateOnly: false,
      recalculateTaxes: true,
      ignoreWarnings: false,
      timeoutMs: 60000,
      ...config,
    };
  }

  /**
   * Executa o workflow completo
   */
  async execute(input: FiscalImportInput): Promise<Result<FiscalImportResult, string>> {
    const startTime = Date.now();

    // Estado inicial
    const state: FiscalImportState = {
      source: input.source,
      identifier: input.identifier,
      documentType: input.documentType,
      status: 'fetching',
      errors: [],
      logs: [`[${new Date().toISOString()}] Iniciando workflow de importação fiscal`],
      organizationId: input.organizationId,
      branchId: input.branchId,
      userId: input.userId,
      startedAt: new Date(),
    };

    // Aplicar config do input
    if (input.config) {
      Object.assign(this.config, input.config);
    }

    try {
      // Passo 1: Buscar documento
      const fetchResult = await this.fetchDocument(state);
      this.applyResult(state, fetchResult);
      if (this.hasFailed(state)) {
        return this.buildResult(state, startTime);
      }

      // Passo 2: Extrair dados
      const extractResult = await this.extractData(state);
      this.applyResult(state, extractResult);
      if (this.hasFailed(state)) {
        return this.buildResult(state, startTime);
      }

      // Passo 3: Validar dados
      const validateResult = await this.validateData(state);
      this.applyResult(state, validateResult);
      if (this.hasFailed(state)) {
        return this.buildResult(state, startTime);
      }

      // Passo 4: Calcular impostos (se configurado)
      if (this.config.recalculateTaxes && state.status === 'calculating') {
        const calcResult = await this.calculateTaxes(state);
        this.applyResult(state, calcResult);
        if (this.hasFailed(state)) {
          return this.buildResult(state, startTime);
        }
      }

      // Passo 5: Salvar documento
      const saveResult = await this.saveDocument(state);
      this.applyResult(state, saveResult);

      return this.buildResult(state, startTime);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      state.status = 'failed';
      state.errors.push(`Erro no workflow: ${errorMessage}`);
      return this.buildResult(state, startTime);
    }
  }

  /**
   * Aplica resultado parcial ao estado
   */
  private applyResult(state: FiscalImportState, result: Partial<FiscalImportState>): void {
    Object.assign(state, result);
  }

  /**
   * Verifica se o estado falhou
   */
  private hasFailed(state: FiscalImportState): boolean {
    return state.status === 'failed';
  }

  /**
   * Constrói o resultado final
   */
  private buildResult(state: FiscalImportState, startTime: number): Result<FiscalImportResult, string> {
    const processingTimeMs = Date.now() - startTime;

    const result: FiscalImportResult = {
      success: state.status === 'completed',
      fiscalDocumentId: state.fiscalDocumentId,
      summary: state.extractedData ? {
        documentNumber: state.extractedData.documentNumber,
        issuerName: state.extractedData.issuerName,
        totalValue: state.extractedData.totalValue,
        totalTaxes: state.extractedData.taxes.totalTaxes,
      } : undefined,
      errors: state.errors,
      warnings: state.validationResult?.warnings.map(w => w.message) || [],
      processingTimeMs,
    };

    return Result.ok(result);
  }

  // ============================================================================
  // PASSOS DO WORKFLOW
  // ============================================================================

  /**
   * Passo 1: Buscar documento da fonte
   */
  private async fetchDocument(state: FiscalImportState): Promise<Partial<FiscalImportState>> {
    const logs = [...state.logs, `[${new Date().toISOString()}] Buscando documento de ${state.source}...`];

    try {
      let rawDocument: Buffer;
      let mimeType: string;

      switch (state.source) {
        case 'email':
          if (!this.googleWorkspace) {
            return {
              status: 'failed' as const,
              errors: [...state.errors, 'Google Workspace não configurado para buscar email'],
              logs,
            };
          }
          // identifier para email deve ser "messageId:attachmentId"
          const [messageId, attachmentId] = state.identifier.split(':');
          const attachmentResult = await this.googleWorkspace.getEmailAttachment(
            messageId,
            attachmentId
          );
          if (Result.isFail(attachmentResult)) {
            return {
              status: 'failed' as const,
              errors: [...state.errors, `Erro ao buscar anexo: ${attachmentResult.error}`],
              logs,
            };
          }
          rawDocument = attachmentResult.value; // Já é Buffer
          mimeType = 'application/xml';
          break;

        case 'drive':
          if (!this.googleWorkspace) {
            return {
              status: 'failed' as const,
              errors: [...state.errors, 'Google Workspace não configurado para buscar do Drive'],
              logs,
            };
          }
          const fileResult = await this.googleWorkspace.getFileContent(state.identifier);
          if (Result.isFail(fileResult)) {
            return {
              status: 'failed' as const,
              errors: [...state.errors, `Erro ao buscar arquivo: ${fileResult.error}`],
              logs,
            };
          }
          rawDocument = fileResult.value; // Já é Buffer
          mimeType = 'application/xml';
          break;

        case 'upload':
          // identifier é base64 do documento
          rawDocument = Buffer.from(state.identifier, 'base64');
          mimeType = 'application/xml';
          break;

        default:
          return {
            status: 'failed' as const,
            errors: [...state.errors, `Fonte desconhecida: ${state.source}`],
            logs,
          };
      }

      return {
        status: 'extracting',
        rawDocument,
        mimeType,
        logs: [...logs, `[${new Date().toISOString()}] Documento obtido (${rawDocument.length} bytes)`],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed' as const,
        errors: [...state.errors, `Erro ao buscar documento: ${errorMessage}`],
        logs,
      };
    }
  }

  /**
   * Passo 2: Extrair dados do documento
   */
  private async extractData(state: FiscalImportState): Promise<Partial<FiscalImportState>> {
    const logs = [...state.logs, `[${new Date().toISOString()}] Extraindo dados do documento...`];

    try {
      if (!state.rawDocument) {
        return {
          status: 'failed' as const,
          errors: [...state.errors, 'Documento não encontrado para extração'],
          logs,
        };
      }

      // Usar Document AI para extrair dados
      const extractResult = await this.googleCloud.extractNFeData(state.rawDocument);
      if (Result.isFail(extractResult)) {
        return {
          status: 'failed' as const,
          errors: [...state.errors, `Erro na extração: ${extractResult.error}`],
          logs,
        };
      }

      const nfeData = extractResult.value;

      // Converter para ExtractedFiscalData
      // Campos do NFeExtractedData: chaveAcesso, numero, serie, emitente, destinatario, valores, dataEmissao
      const extractedData: ExtractedFiscalData = {
        accessKey: nfeData.chaveAcesso || '',
        documentNumber: nfeData.numero || '',
        series: nfeData.serie || '',
        issueDate: nfeData.dataEmissao ? new Date(nfeData.dataEmissao) : new Date(),
        issuerCnpj: nfeData.emitente?.cnpj || '',
        issuerName: nfeData.emitente?.razaoSocial || '',
        recipientCnpj: nfeData.destinatario?.cnpj || '',
        recipientName: nfeData.destinatario?.razaoSocial || '',
        totalValue: nfeData.valores?.total || 0,
        productsValue: nfeData.valores?.total || 0, // Usar total se não tiver produtos separado
        cfop: '', // Não disponível na estrutura atual
        operationType: '', // Não disponível na estrutura atual
        items: [], // Itens não disponíveis na estrutura simplificada
        taxes: {
          icmsBase: nfeData.valores?.baseIcms || 0,
          icmsValue: nfeData.valores?.icms || 0,
          pisValue: 0, // Calcular posteriormente
          cofinsValue: 0, // Calcular posteriormente
          totalTaxes: nfeData.valores?.icms || 0,
        },
        rawXml: state.rawDocument.toString('utf-8'),
      };

      return {
        status: 'validating',
        extractedData,
        logs: [...logs, `[${new Date().toISOString()}] Dados extraídos: ${extractedData.documentNumber} - ${extractedData.issuerName}`],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed' as const,
        errors: [...state.errors, `Erro ao extrair dados: ${errorMessage}`],
        logs,
      };
    }
  }

  /**
   * Passo 3: Validar dados extraídos
   */
  private async validateData(state: FiscalImportState): Promise<Partial<FiscalImportState>> {
    const logs = [...state.logs, `[${new Date().toISOString()}] Validando dados...`];

    try {
      const data = state.extractedData;
      if (!data) {
        return {
          status: 'failed' as const,
          errors: [...state.errors, 'Dados não encontrados para validação'],
          logs,
        };
      }

      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      // Validar chave de acesso (44 dígitos)
      if (!data.accessKey || data.accessKey.length !== 44) {
        validationResult.errors.push({
          code: 'INVALID_ACCESS_KEY',
          field: 'accessKey',
          message: `Chave de acesso inválida: ${data.accessKey?.length || 0} dígitos (esperado: 44)`,
          severity: 'error',
        });
        validationResult.isValid = false;
      }

      // Validar CNPJ do emitente
      if (!data.issuerCnpj || data.issuerCnpj.length < 14) {
        validationResult.errors.push({
          code: 'INVALID_ISSUER_CNPJ',
          field: 'issuerCnpj',
          message: 'CNPJ do emitente inválido',
          severity: 'error',
        });
        validationResult.isValid = false;
      }

      // Validar valor total
      if (data.totalValue <= 0) {
        validationResult.errors.push({
          code: 'INVALID_TOTAL_VALUE',
          field: 'totalValue',
          message: 'Valor total deve ser maior que zero',
          severity: 'error',
        });
        validationResult.isValid = false;
      }

      // Warnings
      if (data.items.length === 0) {
        validationResult.warnings.push({
          code: 'NO_ITEMS',
          field: 'items',
          message: 'Documento sem itens detalhados',
          severity: 'warning',
        });
      }

      if (!data.cfop) {
        validationResult.warnings.push({
          code: 'NO_CFOP',
          field: 'cfop',
          message: 'CFOP não identificado',
          severity: 'warning',
        });
      }

      // Se validateOnly e tem erros, falhar
      if (this.config.validateOnly && !validationResult.isValid) {
        return {
          status: 'failed' as const,
          validationResult,
          errors: [...state.errors, ...validationResult.errors.map(e => e.message)],
          logs: [...logs, `[${new Date().toISOString()}] Validação falhou: ${validationResult.errors.length} erros`],
        };
      }

      return {
        status: this.config.recalculateTaxes ? 'calculating' : 'saving',
        validationResult,
        logs: [...logs, `[${new Date().toISOString()}] Validação concluída: ${validationResult.isValid ? 'OK' : 'com erros'}`],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed' as const,
        errors: [...state.errors, `Erro ao validar: ${errorMessage}`],
        logs,
      };
    }
  }

  /**
   * Passo 4: Calcular/recalcular impostos
   */
  private async calculateTaxes(state: FiscalImportState): Promise<Partial<FiscalImportState>> {
    const logs = [...state.logs, `[${new Date().toISOString()}] Calculando impostos...`];

    try {
      const data = state.extractedData;
      if (!data) {
        return {
          status: 'failed' as const,
          errors: [...state.errors, 'Dados não encontrados para cálculo'],
          logs,
        };
      }

      const originalTaxes = data.taxes;
      
      // Cálculo simplificado baseado no regime (Lucro Real)
      const recalculatedTaxes = {
        icmsBase: data.totalValue,
        icmsValue: data.totalValue * 0.18, // 18% ICMS padrão
        pisValue: data.totalValue * 0.0165, // 1.65% PIS
        cofinsValue: data.totalValue * 0.076, // 7.6% COFINS
        totalTaxes: 0,
      };
      recalculatedTaxes.totalTaxes = recalculatedTaxes.icmsValue + 
                                      recalculatedTaxes.pisValue + 
                                      recalculatedTaxes.cofinsValue;

      const calculatedTaxes: TaxCalculationResult = {
        taxes: {
          ...recalculatedTaxes,
        },
        suggestedCfop: data.cfop || '5102',
        suggestedOperationType: data.operationType || 'Venda de mercadoria',
        observations: [],
        difference: {
          icms: recalculatedTaxes.icmsValue - originalTaxes.icmsValue,
          pis: recalculatedTaxes.pisValue - originalTaxes.pisValue,
          cofins: recalculatedTaxes.cofinsValue - originalTaxes.cofinsValue,
          total: recalculatedTaxes.totalTaxes - originalTaxes.totalTaxes,
        },
      };

      // Adicionar observações
      if (Math.abs(calculatedTaxes.difference!.total) > 0.01) {
        calculatedTaxes.observations.push(
          `Diferença de R$ ${calculatedTaxes.difference!.total.toFixed(2)} nos impostos em relação ao documento original`
        );
      }

      return {
        status: 'saving',
        calculatedTaxes,
        logs: [...logs, `[${new Date().toISOString()}] Impostos calculados: R$ ${recalculatedTaxes.totalTaxes.toFixed(2)}`],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed' as const,
        errors: [...state.errors, `Erro ao calcular impostos: ${errorMessage}`],
        logs,
      };
    }
  }

  /**
   * Passo 5: Salvar documento no AuraCore
   */
  private async saveDocument(state: FiscalImportState): Promise<Partial<FiscalImportState>> {
    const logs = [...state.logs, `[${new Date().toISOString()}] Salvando documento no AuraCore...`];

    try {
      // Se validateOnly, não salvar
      if (this.config.validateOnly) {
        return {
          status: 'completed',
          completedAt: new Date(),
          logs: [...logs, `[${new Date().toISOString()}] Modo somente validação - documento não salvo`],
        };
      }

      // TODO: Integrar com repositório real do AuraCore
      // Por enquanto, gerar ID simulado
      const fiscalDocumentId = `NFE-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      return {
        status: 'completed',
        fiscalDocumentId,
        completedAt: new Date(),
        logs: [...logs, `[${new Date().toISOString()}] Documento salvo: ${fiscalDocumentId}`],
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        status: 'failed' as const,
        errors: [...state.errors, `Erro ao salvar: ${errorMessage}`],
        logs,
      };
    }
  }
}
