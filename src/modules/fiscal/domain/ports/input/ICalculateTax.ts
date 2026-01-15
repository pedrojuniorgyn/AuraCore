/**
 * Input Port: Cálculo de Impostos
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface CalculateTaxInput {
  /** ID do documento fiscal */
  documentId: string;
  /** Forçar recálculo */
  force?: boolean;
}

export interface TaxBreakdown {
  taxType: string;
  baseAmount: number;
  rate: number;
  amount: number;
  description: string;
}

export interface CalculateTaxOutput {
  documentId: string;
  taxes: TaxBreakdown[];
  totalTax: number;
  totalDocument: number;
  calculatedAt: Date;
}

export interface ICalculateTax {
  execute(
    input: CalculateTaxInput,
    context: ExecutionContext
  ): Promise<Result<CalculateTaxOutput, string>>;
}
