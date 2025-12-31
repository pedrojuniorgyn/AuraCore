/**
 * RtcMockValidator: Mock do Validador RTC (Registro de Transação de Crédito)
 * 
 * E7.4.1 Semana 9 - XML Builders + Validação
 * 
 * Responsabilidades:
 * - Simular validação RTC da SEFAZ
 * - Validar registro de transações de crédito IBS/CBS
 * - Verificar consistência de créditos tributários
 * - Em produção: integrar com web service real da SEFAZ
 * 
 * IMPORTANTE: Este é um MOCK para desenvolvimento. Em produção, usar web service RTC real.
 * 
 * Referência: Portal SEFAZ - Sistema RTC (Registro de Transação de Crédito)
 */

export interface RtcValidationResult {
  valid: boolean;
  protocol?: string;
  errors: RtcValidationError[];
  warnings: RtcValidationWarning[];
  timestamp: Date;
}

export interface RtcValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'ERROR' | 'FATAL';
}

export interface RtcValidationWarning {
  code: string;
  message: string;
  field?: string;
}

export interface FiscalDocument {
  id: string;
  type: 'CTE' | 'NFE' | 'MDFE' | 'NFSE';
  number: string;
  series: string;
  organizationId: number;
  branchId: number;
  operationDate: Date;
  totalValue: number;
  ibsCbsCredits?: {
    ibsUfCredit: number;
    ibsMunCredit: number;
    cbsCredit: number;
  };
}

export interface IRtcValidator {
  validate(document: FiscalDocument): Promise<RtcValidationResult>;
  validateBatch(documents: FiscalDocument[]): Promise<RtcValidationResult[]>;
}

/**
 * Mock do validador RTC da SEFAZ
 * 
 * Em produção: substituir por integração real com web service SEFAZ
 */
export class RtcMockValidator implements IRtcValidator {
  private static instance: RtcMockValidator;

  private constructor() {
    // Singleton
  }

  /**
   * Obter instância singleton
   */
  static getInstance(): RtcMockValidator {
    if (!RtcMockValidator.instance) {
      RtcMockValidator.instance = new RtcMockValidator();
    }
    return RtcMockValidator.instance;
  }

  /**
   * Valida documento contra RTC (mock)
   * 
   * @param document Documento fiscal a validar
   * @returns RtcValidationResult
   * 
   * @example
   * ```typescript
   * const validator = RtcMockValidator.getInstance();
   * const result = await validator.validate(document);
   * if (!result.valid) {
   *   console.error('Erros RTC:', result.errors);
   * }
   * ```
   */
  async validate(document: FiscalDocument): Promise<RtcValidationResult> {
    const errors: RtcValidationError[] = [];
    const warnings: RtcValidationWarning[] = [];

    try {
      // Simular delay de rede (mock)
      await this.simulateNetworkDelay();

      // 1. Validar campos obrigatórios
      this.validateRequiredFields(document, errors);

      // 2. Validar tipo de documento suportado
      this.validateDocumentType(document, errors);

      // 3. Validar créditos IBS/CBS (se presente)
      if (document.ibsCbsCredits) {
        this.validateCredits(document, errors, warnings);
      }

      // 4. Validar data da operação
      this.validateOperationDate(document, errors, warnings);

      // 5. Gerar protocolo (mock)
      const protocol = errors.length === 0 
        ? this.generateMockProtocol(document)
        : undefined;

      return {
        valid: errors.length === 0,
        protocol,
        errors,
        warnings,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            code: 'RTC_INTERNAL_ERROR',
            message: `Erro interno ao validar RTC: ${error instanceof Error ? error.message : String(error)}`,
            severity: 'FATAL',
          },
        ],
        warnings: [],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Valida lote de documentos (mock)
   */
  async validateBatch(documents: FiscalDocument[]): Promise<RtcValidationResult[]> {
    const results: RtcValidationResult[] = [];
    
    for (const document of documents) {
      const result = await this.validate(document);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Valida campos obrigatórios
   */
  private validateRequiredFields(document: FiscalDocument, errors: RtcValidationError[]): void {
    if (!document.id) {
      errors.push({
        code: 'RTC_MISSING_FIELD',
        message: 'Campo id é obrigatório',
        field: 'id',
        severity: 'ERROR',
      });
    }

    if (!document.number) {
      errors.push({
        code: 'RTC_MISSING_FIELD',
        message: 'Campo number é obrigatório',
        field: 'number',
        severity: 'ERROR',
      });
    }

    if (!document.operationDate) {
      errors.push({
        code: 'RTC_MISSING_FIELD',
        message: 'Campo operationDate é obrigatório',
        field: 'operationDate',
        severity: 'ERROR',
      });
    }
  }

  /**
   * Valida tipo de documento
   */
  private validateDocumentType(document: FiscalDocument, errors: RtcValidationError[]): void {
    const supportedTypes: FiscalDocument['type'][] = ['CTE', 'NFE', 'MDFE', 'NFSE'];
    
    if (!supportedTypes.includes(document.type)) {
      errors.push({
        code: 'RTC_INVALID_DOCUMENT_TYPE',
        message: `Tipo de documento ${document.type} não suportado pelo RTC`,
        field: 'type',
        severity: 'ERROR',
      });
    }
  }

  /**
   * Valida créditos IBS/CBS
   */
  private validateCredits(
    document: FiscalDocument,
    errors: RtcValidationError[],
    warnings: RtcValidationWarning[]
  ): void {
    const credits = document.ibsCbsCredits!;

    // Validar valores não negativos
    if (credits.ibsUfCredit < 0) {
      errors.push({
        code: 'RTC_INVALID_CREDIT',
        message: 'Crédito IBS UF não pode ser negativo',
        field: 'ibsUfCredit',
        severity: 'ERROR',
      });
    }

    if (credits.ibsMunCredit < 0) {
      errors.push({
        code: 'RTC_INVALID_CREDIT',
        message: 'Crédito IBS Municipal não pode ser negativo',
        field: 'ibsMunCredit',
        severity: 'ERROR',
      });
    }

    if (credits.cbsCredit < 0) {
      errors.push({
        code: 'RTC_INVALID_CREDIT',
        message: 'Crédito CBS não pode ser negativo',
        field: 'cbsCredit',
        severity: 'ERROR',
      });
    }

    // Validar limite de créditos (10% do valor total)
    const totalCredits = credits.ibsUfCredit + credits.ibsMunCredit + credits.cbsCredit;
    const maxCredits = document.totalValue * 0.10;

    if (totalCredits > maxCredits) {
      warnings.push({
        code: 'RTC_HIGH_CREDITS',
        message: `Créditos totais (${totalCredits.toFixed(2)}) excedem 10% do valor total (${maxCredits.toFixed(2)})`,
        field: 'ibsCbsCredits',
      });
    }
  }

  /**
   * Valida data da operação
   */
  private validateOperationDate(
    document: FiscalDocument,
    errors: RtcValidationError[],
    warnings: RtcValidationWarning[]
  ): void {
    const operationDate = new Date(document.operationDate);
    const now = new Date();
    const transitionDate = new Date('2026-01-01'); // Data de transição IBS/CBS

    // Validar data não futura
    if (operationDate > now) {
      errors.push({
        code: 'RTC_FUTURE_DATE',
        message: 'Data da operação não pode ser futura',
        field: 'operationDate',
        severity: 'ERROR',
      });
    }

    // Validar data após transição (para RTC ser necessário)
    if (operationDate < transitionDate) {
      warnings.push({
        code: 'RTC_BEFORE_TRANSITION',
        message: 'Data da operação anterior à transição IBS/CBS (01/01/2026)',
        field: 'operationDate',
      });
    }
  }

  /**
   * Gera protocolo mockado
   */
  private generateMockProtocol(document: FiscalDocument): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `RTC${document.type}${timestamp}${random}`;
  }

  /**
   * Simula delay de rede (mock)
   */
  private async simulateNetworkDelay(): Promise<void> {
    const delay = Math.random() * 100 + 50; // 50-150ms
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

