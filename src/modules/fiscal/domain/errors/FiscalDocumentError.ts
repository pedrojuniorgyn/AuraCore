/**
 * Fiscal Document Error
 * 
 * Erro de domínio para operações com documentos fiscais
 */

export class FiscalDocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FiscalDocumentError';
    Object.setPrototypeOf(this, FiscalDocumentError.prototype);
  }
}

