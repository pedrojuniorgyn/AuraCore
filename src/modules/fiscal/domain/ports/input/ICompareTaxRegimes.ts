/**
 * Input Port: Comparação de Regimes Tributários
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface CompareTaxRegimesInput {
  /** ID do documento fiscal */
  documentId: string;
  /** Regimes a comparar */
  regimes: Array<'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL'>;
}

export interface RegimeComparison {
  regime: string;
  taxes: Array<{
    taxType: string;
    rate: number;
    amount: number;
  }>;
  totalTax: number;
  effectiveRate: number;
}

export interface CompareTaxRegimesOutput {
  documentId: string;
  comparisons: RegimeComparison[];
  recommendation: {
    regime: string;
    reason: string;
    savings: number;
  };
  comparedAt: Date;
}

export interface ICompareTaxRegimes {
  execute(
    input: CompareTaxRegimesInput,
    context: ExecutionContext
  ): Promise<Result<CompareTaxRegimesOutput, string>>;
}
