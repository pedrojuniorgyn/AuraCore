/**
 * 💰 FINANCIAL TITLE ERROR
 * 
 * Custom error class for financial title generation errors
 * 
 * Épico: E7.13 - Migration to DDD
 */

export class FinancialTitleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FinancialTitleError';
    Object.setPrototypeOf(this, FinancialTitleError.prototype);
  }

  static documentNotFound(documentId: bigint | number): FinancialTitleError {
    return new FinancialTitleError(
      `Documento fiscal #${documentId} não encontrado`
    );
  }

  static invalidClassification(
    classification: string,
    expected: string
  ): FinancialTitleError {
    return new FinancialTitleError(
      `Documento classificado como ${classification}. Apenas documentos ${expected} geram este tipo de título.`
    );
  }

  static titleAlreadyExists(documentId: bigint | number): FinancialTitleError {
    return new FinancialTitleError(
      `Documento #${documentId} já possui título financeiro gerado`
    );
  }

  static titleNotFound(documentId: bigint | number): FinancialTitleError {
    return new FinancialTitleError(
      `Documento #${documentId} não possui títulos gerados`
    );
  }

  static titleAlreadyPaid(): FinancialTitleError {
    return new FinancialTitleError(
      'Não é possível reverter títulos já pagos ou recebidos'
    );
  }
}

