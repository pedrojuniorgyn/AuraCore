/**
 * IReceivePayment - Port de Input para registrar recebimento
 */
import { Result } from '@/shared/domain';

/**
 * F1.6: Adicionados campos opcionais interest, fine, discount
 * para recebimentos com componentes adicionais.
 * 
 * Valor efetivo = principal + interest + fine - discount
 */
export interface ReceivePaymentInput {
  receivableId: string;
  amount: number;
  bankAccountId: number;
  paymentDate?: Date;
  notes?: string;
  // F1.6: Componentes adicionais de recebimento
  interest?: number;  // Juros recebidos
  fine?: number;       // Multa recebida
  discount?: number;   // Desconto concedido
}

export interface ReceivePaymentOutput {
  id: string;
  amountReceived: number;
  remainingAmount: number;
  status: string;
  receiveDate: Date | null;
  // F1.6: Breakdown dos componentes
  breakdown?: {
    principal: number;
    interest: number;
    fine: number;
    discount: number;
    effectiveAmount: number;
  };
}

export interface IReceivePayment {
  execute(
    input: ReceivePaymentInput,
    context: { organizationId: number; branchId: number; userId: string }
  ): Promise<Result<ReceivePaymentOutput, string>>;
}
