/**
 * Financial Error
 * 
 * Erro de domínio para operações financeiras
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 5/8 - financial-title-generator.ts → FinancialTitleGenerator
 */

export class FinancialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinancialError';
    Object.setPrototypeOf(this, FinancialError.prototype);
  }
}

export class InvalidClassificationError extends FinancialError {
  constructor(
    public readonly classification: string,
    public readonly expectedClassifications: string[]
  ) {
    super(
      `Documento classificado como ${classification}. ` +
      `Apenas documentos ${expectedClassifications.join(' ou ')} geram títulos financeiros.`
    );
    this.name = 'InvalidClassificationError';
  }
}

export class TitleAlreadyGeneratedError extends FinancialError {
  constructor(fiscalDocumentId: bigint) {
    super(`Documento fiscal ${fiscalDocumentId} já possui título financeiro gerado`);
    this.name = 'TitleAlreadyGeneratedError';
  }
}

export class TitleAlreadyPaidError extends FinancialError {
  constructor(titleId: bigint) {
    super(`Título ${titleId} já foi pago/recebido e não pode ser revertido`);
    this.name = 'TitleAlreadyPaidError';
  }
}

export class NoTitlesFoundError extends FinancialError {
  constructor(fiscalDocumentId: bigint) {
    super(`Documento fiscal ${fiscalDocumentId} não possui títulos gerados`);
    this.name = 'NoTitlesFoundError';
  }
}

