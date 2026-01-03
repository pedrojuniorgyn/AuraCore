/**
 * IBankingGateway - Port para operações bancárias
 * 
 * E7.9 Integrações - Semana 1
 * 
 * Abstrai comunicação com APIs bancárias (BTG, Inter, etc):
 * - Geração de boletos
 * - Cobrança Pix
 * - Pagamentos (Pix, TED, DOC)
 * - DDA (Débito Direto Autorizado)
 * - Consulta de saldo/extrato
 * 
 * Princípios Hexagonais:
 * - Domain NÃO conhece qual banco está sendo usado
 * - Implementations: BtgBankingAdapter (BTG real), MockBankingGateway (teste)
 */

import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';

// Boletos
export interface CreateBankSlipRequest {
  amount: Money;
  dueDate: Date;
  recipientName: string;
  recipientDocument: string;  // CPF ou CNPJ
  description: string;
  organizationId: number;
  branchId: number;
}

export interface BankSlipResponse {
  id: string;
  barcode: string;
  digitableLine: string;
  qrCodePix?: string;
  dueDate: Date;
  amount: Money;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  pdfUrl?: string;
}

// Pix
export interface CreatePixChargeRequest {
  amount: Money;
  recipientName: string;
  recipientDocument: string;
  description: string;
  expirationMinutes?: number;
}

export interface PixChargeResponse {
  txId: string;
  qrCode: string;
  qrCodeImage: string;
  amount: Money;
  expiresAt: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
}

// Pagamentos
export interface PaymentRequest {
  type: 'PIX' | 'TED' | 'DOC' | 'BOLETO';
  amount: Money;
  recipientName: string;
  recipientDocument: string;
  recipientBankCode?: string;
  recipientAgency?: string;
  recipientAccount?: string;
  pixKey?: string;
  barcode?: string;
  description?: string;
}

export interface PaymentResponse {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  amount: Money;
  scheduledDate?: Date;
  completedAt?: Date;
  failureReason?: string;
}

// DDA
export interface DdaDebit {
  id: string;
  barcode: string;
  amount: Money;
  dueDate: Date;
  issuerName: string;
  issuerDocument: string;
  status: 'PENDING' | 'AUTHORIZED' | 'PAID' | 'REJECTED';
}

/**
 * IBankingGateway - Port para operações bancárias
 * 
 * IMPORTANTE: Todas as operações retornam Result<T> ou Result<T, string>
 * NUNCA Result<T, Error> (regra MCP ENFORCE-012)
 */
export interface IBankingGateway {
  // Cobrança
  createBankSlip(request: CreateBankSlipRequest): Promise<Result<BankSlipResponse, string>>;
  cancelBankSlip(slipId: string): Promise<Result<void, string>>;
  queryBankSlipStatus(slipId: string): Promise<Result<BankSlipResponse, string>>;
  
  // Pix
  createPixCharge(request: CreatePixChargeRequest): Promise<Result<PixChargeResponse, string>>;
  queryPixChargeStatus(txId: string): Promise<Result<PixChargeResponse, string>>;
  
  // Pagamentos
  executePayment(request: PaymentRequest): Promise<Result<PaymentResponse, string>>;
  queryPaymentStatus(paymentId: string): Promise<Result<PaymentResponse, string>>;
  
  // DDA
  queryDdaDebits(cnpj: string): Promise<Result<DdaDebit[], string>>;
  authorizeDdaDebit(debitId: string): Promise<Result<void, string>>;
  
  // Saldo
  queryBalance(accountId: string): Promise<Result<Money, string>>;
}

