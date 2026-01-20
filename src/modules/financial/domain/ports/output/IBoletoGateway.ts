/**
 * Gateway para geração de boletos
 * 
 * @since E9 Fase 2
 * TODO (E10): Migrar lógica para Domain Services
 */

import { Result } from '@/shared/domain';

export interface BoletoGenerationParams {
  customerId: number;
  customerName: string;
  customerCnpj: string;
  dueDate: Date;
  value: number;
  invoiceNumber: string;
  description: string;
}

export interface BoletoResult {
  boletoNumber: string;
  barcode: string;
  digitableLine: string;
  pdfUrl?: string;
  pixKey?: string;
}

export interface IBoletoGateway {
  generate(params: BoletoGenerationParams): Promise<Result<BoletoResult, string>>;
}
