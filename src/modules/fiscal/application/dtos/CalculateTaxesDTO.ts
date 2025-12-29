import { z } from 'zod';

/**
 * DTO: Calculate Taxes Input
 */
export const CalculateTaxesInputSchema = z.object({
  fiscalDocumentId: z.string().uuid(),
});

export type CalculateTaxesInput = z.infer<typeof CalculateTaxesInputSchema>;

/**
 * DTO: Calculate Taxes Output
 */
export interface CalculateTaxesOutput {
  fiscalDocumentId: string;
  totalTaxes: number;
  taxes: {
    icms?: {
      baseCalculo: number;
      aliquota: number;
      valor: number;
    };
    ipi?: {
      valor: number;
      aliquota: number;
    };
    pis?: {
      valor: number;
      aliquota: number;
    };
    cofins?: {
      valor: number;
      aliquota: number;
    };
    iss?: {
      valor: number;
      aliquota: number;
    };
  };
}

