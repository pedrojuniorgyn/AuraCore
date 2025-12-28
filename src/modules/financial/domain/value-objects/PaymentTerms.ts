import { ValueObject, Result, Money } from '@/shared/domain';

interface PaymentTermsProps extends Record<string, unknown> {
  dueDate: Date;
  amount: Money;
  discountUntil?: Date;
  discountAmount?: Money;
  fineRate: number;      // % multa após vencimento
  interestRate: number;  // % juros ao mês
}

/**
 * Value Object para condições de pagamento
 */
export class PaymentTerms extends ValueObject<PaymentTermsProps> {
  private constructor(props: PaymentTermsProps) {
    super(props);
  }

  get dueDate(): Date { return this.props.dueDate; }
  get amount(): Money { return this.props.amount; }
  get discountUntil(): Date | undefined { return this.props.discountUntil; }
  get discountAmount(): Money | undefined { return this.props.discountAmount; }
  get fineRate(): number { return this.props.fineRate; }
  get interestRate(): number { return this.props.interestRate; }

  static create(props: {
    dueDate: Date;
    amount: Money;
    discountUntil?: Date;
    discountAmount?: Money;
    fineRate?: number;
    interestRate?: number;
  }): Result<PaymentTerms, string> {
    if (!(props.dueDate instanceof Date) || isNaN(props.dueDate.getTime())) {
      return Result.fail('Invalid due date');
    }

    if (!props.amount.isPositive()) {
      return Result.fail('Amount must be positive');
    }

    if (props.discountUntil && props.discountUntil > props.dueDate) {
      return Result.fail('Discount date must be before or equal to due date');
    }

    return Result.ok(new PaymentTerms({
      dueDate: props.dueDate,
      amount: props.amount,
      discountUntil: props.discountUntil,
      discountAmount: props.discountAmount,
      fineRate: props.fineRate ?? 2,        // Default 2% multa
      interestRate: props.interestRate ?? 1, // Default 1% juros/mês
    }));
  }

  /**
   * Verifica se está vencido
   */
  isOverdue(referenceDate: Date = new Date()): boolean {
    return referenceDate > this.props.dueDate;
  }

  /**
   * Verifica se tem desconto disponível
   */
  hasDiscountAvailable(referenceDate: Date = new Date()): boolean {
    if (!this.props.discountUntil || !this.props.discountAmount) {
      return false;
    }
    return referenceDate <= this.props.discountUntil;
  }

  /**
   * Calcula valor com desconto (se aplicável)
   */
  calculateWithDiscount(referenceDate: Date = new Date()): Money {
    if (this.hasDiscountAvailable(referenceDate) && this.props.discountAmount) {
      const result = this.props.amount.subtract(this.props.discountAmount);
      if (Result.isOk(result)) {
        return result.value;
      }
    }
    return this.props.amount;
  }

  /**
   * Calcula multa por atraso
   */
  calculateFine(): Result<Money, string> {
    return this.props.amount.percentage(this.props.fineRate);
  }

  /**
   * Calcula juros por atraso (pro-rata por dia)
   */
  calculateInterest(referenceDate: Date = new Date()): Result<Money, string> {
    if (!this.isOverdue(referenceDate)) {
      return Money.create(0, this.props.amount.currency);
    }

    const daysOverdue = Math.ceil(
      (referenceDate.getTime() - this.props.dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Juros diário = juros mensal / 30
    const dailyRate = this.props.interestRate / 30;
    const totalInterestRate = dailyRate * daysOverdue;
    
    return this.props.amount.percentage(totalInterestRate);
  }

  /**
   * Calcula valor total a pagar (com multa e juros se vencido)
   */
  calculateTotalDue(referenceDate: Date = new Date()): Result<Money, string> {
    let total = this.calculateWithDiscount(referenceDate);

    if (this.isOverdue(referenceDate)) {
      // Adicionar multa
      const fineResult = this.calculateFine();
      if (Result.isOk(fineResult)) {
        const addFineResult = total.add(fineResult.value);
        if (Result.isOk(addFineResult)) {
          total = addFineResult.value;
        }
      }

      // Adicionar juros
      const interestResult = this.calculateInterest(referenceDate);
      if (Result.isOk(interestResult)) {
        const addInterestResult = total.add(interestResult.value);
        if (Result.isOk(addInterestResult)) {
          total = addInterestResult.value;
        }
      }
    }

    return Result.ok(total);
  }
}

