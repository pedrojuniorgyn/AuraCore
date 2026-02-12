/**
 * IPartialPayment - Input Port (ARCH-010) — F2.2
 * 
 * Registra recebimento parcial de um título a receber.
 * Diferente do ReceivePaymentUseCase que pode fechar o título,
 * este explicitamente permite pagamentos parciais e rastreia o saldo.
 */
import { Result } from '@/shared/domain';

export interface PartialPaymentInput {
  receivableId: string;
  amount: number;
  bankAccountId: number;
  paymentDate?: string; // ISO date, defaults to now
  notes?: string;
}

export interface PartialPaymentOutput {
  receivableId: string;
  amountReceived: number;
  totalReceived: number;
  remainingAmount: number;
  newStatus: string;
}

export interface IPartialPayment {
  execute(
    input: PartialPaymentInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<PartialPaymentOutput, string>>;
}
