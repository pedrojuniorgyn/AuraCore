/**
 * Input Port: Criação de Documento Fiscal
 * 
 * @see ARCH-010: Use Cases implementam interface de domain/ports/input/
 */

import { Result } from '@/shared/domain';
import { ExecutionContext } from './IAuthorizeFiscalDocument';

export interface CreateFiscalDocumentInput {
  /** Tipo: NFE, NFCE, CTE, MDFE, NFSE */
  documentType: 'NFE' | 'NFCE' | 'CTE' | 'MDFE' | 'NFSE';
  /** Série */
  series: string;
  /** Data de emissão */
  issueDate: Date | string;
  /** ID do emitente */
  issuerId: string;
  /** CNPJ do emitente */
  issuerCnpj: string;
  /** Nome do emitente */
  issuerName: string;
  /** ID do destinatário */
  recipientId: string;
  /** CNPJ/CPF do destinatário */
  recipientCnpjCpf?: string;
  /** Nome do destinatário */
  recipientName?: string;
  /** Itens do documento */
  items: Array<{
    productCode: string;
    description: string;
    ncm?: string;
    cfop: string;
    quantity: number;
    unitPrice: number;
    unitOfMeasure: string;
  }>;
  /** Observações */
  notes?: string;
}

export interface CreateFiscalDocumentOutput {
  id: string;
  documentType: string;
  series: string;
  number: string;
  status: 'DRAFT';
  issueDate: Date;
  issuerId: string;
  issuerName: string;
  recipientCnpjCpf?: string;
  recipientName?: string;
  totalDocument: number;
  itemsCount: number;
  createdAt: Date;
}

export interface ICreateFiscalDocument {
  execute(
    input: CreateFiscalDocumentInput,
    context: ExecutionContext
  ): Promise<Result<CreateFiscalDocumentOutput, string>>;
}
