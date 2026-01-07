/**
 * 💰 PAYMENT ENGINE SERVICE
 * 
 * Cálculo automático de juros, multa, IOF e tarifas bancárias
 */

export interface PaymentCalculation {
  originalAmount: number;
  dueDate: Date;
  paymentDate: Date;
  interestRate?: number; // % ao dia (padrão: 0.033% = 1% ao mês)
  fineRate?: number; // % fixo (padrão: 2%)
  iofRate?: number; // % fixo (padrão: 0.0038% ao dia)
  bankFee?: number; // Tarifa fixa
}

export interface PaymentResult {
  originalAmount: number;
  interestAmount: number;
  fineAmount: number;
  iofAmount: number;
  bankFeeAmount: number;
  totalAmount: number;
  daysLate: number;
}

/**
 * Calcula juros, multa e IOF automaticamente
 */
export function calculatePayment(params: PaymentCalculation): PaymentResult {
  const {
    originalAmount,
    dueDate,
    paymentDate,
    interestRate = 0.033, // 1% ao mês = 0.033% ao dia
    fineRate = 2.0, // 2% de multa
    iofRate = 0.0038, // 0.0038% ao dia
    bankFee = 0,
  } = params;

  // Calcular dias de atraso
  const daysLate = Math.max(
    0,
    Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Multa (apenas se atrasado)
  const fineAmount = daysLate > 0 ? originalAmount * (fineRate / 100) : 0;

  // Juros (proporcional aos dias de atraso)
  const interestAmount = daysLate > 0 ? originalAmount * (interestRate / 100) * daysLate : 0;

  // IOF (apenas para alguns casos - opcional)
  const iofAmount = daysLate > 0 ? originalAmount * (iofRate / 100) * daysLate : 0;

  const totalAmount = originalAmount + fineAmount + interestAmount + iofAmount + bankFee;

  return {
    originalAmount,
    interestAmount: parseFloat(interestAmount.toFixed(2)),
    fineAmount: parseFloat(fineAmount.toFixed(2)),
    iofAmount: parseFloat(iofAmount.toFixed(2)),
    bankFeeAmount: bankFee,
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    daysLate,
  };
}

/**
 * Calcula desconto para pagamento antecipado
 */
export function calculateDiscount(
  originalAmount: number,
  dueDate: Date,
  paymentDate: Date,
  discountRate: number = 1.0 // 1% ao mês
): number {
  const daysEarly = Math.max(
    0,
    Math.floor((dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (daysEarly === 0) return 0;

  const monthsEarly = daysEarly / 30;
  const discountAmount = originalAmount * (discountRate / 100) * monthsEarly;

  return parseFloat(discountAmount.toFixed(2));
}































