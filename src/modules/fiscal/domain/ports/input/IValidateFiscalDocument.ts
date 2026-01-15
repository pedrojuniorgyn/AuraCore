/**
 * Input Port: Validação de Documento Fiscal
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface ValidateFiscalDocumentInput {
  /** ID do documento fiscal */
  documentId: string;
  /** Tipo de validação */
  validationType?: 'SCHEMA' | 'BUSINESS_RULES' | 'SEFAZ_RULES' | 'ALL';
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ValidateFiscalDocumentOutput {
  documentId: string;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validatedAt: Date;
}

export interface IValidateFiscalDocument {
  execute(
    input: ValidateFiscalDocumentInput,
    context: ExecutionContext
  ): Promise<Result<ValidateFiscalDocumentOutput, string>>;
}
