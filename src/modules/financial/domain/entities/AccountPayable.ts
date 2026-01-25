import { AggregateRoot, Result, Money } from '@/shared/domain';
import { PaymentTerms } from '../value-objects/PaymentTerms';
import { Payment, PaymentMethod } from './Payment';
import { 
  PayableCreatedEvent, 
  PaymentCompletedEvent, 
  PayableCancelledEvent 
} from '../events/PayableEvents';
import {
  PayableAlreadyPaidError,
  PayableCancelledError,
  PayableInProcessingError,
  OverpaymentError,
} from '../errors/FinancialErrors';

export type PayableStatus = 'OPEN' | 'PROCESSING' | 'PARTIAL' | 'PAID' | 'CANCELLED';

interface AccountPayableProps {
  organizationId: number;
  branchId: number;
  supplierId: number;
  documentNumber: string;
  description: string;
  terms: PaymentTerms;
  status: PayableStatus;
  payments: Payment[];
  categoryId?: number;
  costCenterId?: number;
  notes?: string;
  version: number;
}

/**
 * Aggregate Root para Contas a Pagar
 * 
 * Invariantes:
 * - Status PAID não pode receber mais pagamentos
 * - Status CANCELLED não pode ser modificado
 * - Status PROCESSING não permite edição de valores
 * - Soma dos pagamentos não pode exceder valor devido
 */
export class AccountPayable extends AggregateRoot<string> {
  private _props: AccountPayableProps;

  private constructor(id: string, props: AccountPayableProps, createdAt?: Date) {
    super(id, createdAt);
    this._props = props;
  }

  // Getters básicos
  get organizationId(): number { return this._props.organizationId; }
  get branchId(): number { return this._props.branchId; }
  get supplierId(): number { return this._props.supplierId; }
  get documentNumber(): string { return this._props.documentNumber; }
  get description(): string { return this._props.description; }
  get terms(): PaymentTerms { return this._props.terms; }
  get status(): PayableStatus { return this._props.status; }
  get payments(): readonly Payment[] { return [...this._props.payments]; }
  get categoryId(): number | undefined { return this._props.categoryId; }
  get costCenterId(): number | undefined { return this._props.costCenterId; }
  get notes(): string | undefined { return this._props.notes; }
  get version(): number { return this._props.version; }

  // Getters calculados
  get originalAmount(): Money { return this._props.terms.amount; }
  
  /**
   * ⚠️ S1.3: Convertido de getter para método que retorna Result (getters não devem fazer throw)
   */
  getTotalPaid(): Result<Money, string> {
    const currency = this._props.terms.amount.currency;
    const zeroResult = Money.zero(currency);
    
    if (Result.isFail(zeroResult)) {
      // Fallback para criar zero manualmente se falhar
      const fallbackResult = Money.create(0, currency);
      if (Result.isFail(fallbackResult)) {
        return Result.fail('Failed to create zero money');
      }
      
      const total = this._props.payments
        .filter(p => p.status === 'CONFIRMED')
        .reduce((sum, p) => {
          const result = sum.add(p.amount);
          return Result.isOk(result) ? result.value : sum;
        }, fallbackResult.value);
      return Result.ok(total);
    }

    const total = this._props.payments
      .filter(p => p.status === 'CONFIRMED')
      .reduce((sum, p) => {
        const result = sum.add(p.amount);
        return Result.isOk(result) ? result.value : sum;
      }, zeroResult.value);
    return Result.ok(total);
  }

  get remainingAmount(): Money {
    const totalDueResult = this._props.terms.calculateTotalDue();
    if (Result.isFail(totalDueResult)) {
      // Se não consegue calcular total devido, usa valor original
      return this._props.terms.amount;
    }
    
    const totalDue = totalDueResult.value;
    const subtractResult = totalDue.subtract(this.totalPaid);
    
    // Se subtract falhar, retorna total devido (não o original)
    return Result.isOk(subtractResult) ? subtractResult.value : totalDue;
  }

  get isOverdue(): boolean {
    return this._props.terms.isOverdue() && 
           this._props.status !== 'PAID' && 
           this._props.status !== 'CANCELLED';
  }

  /**
   * Factory method - cria nova conta a pagar
   */
  static create(props: {
    id: string;
    organizationId: number;
    branchId: number;
    supplierId: number;
    documentNumber: string;
    description: string;
    terms: PaymentTerms;
    categoryId?: number;
    costCenterId?: number;
    notes?: string;
  }): Result<AccountPayable, string> {
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Payable id is required');
    }

    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Organization id is required');
    }

    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Branch id is required');
    }

    if (!props.supplierId || props.supplierId <= 0) {
      return Result.fail('Supplier id is required');
    }

    if (!props.documentNumber || props.documentNumber.trim() === '') {
      return Result.fail('Document number is required');
    }

    const payable = new AccountPayable(props.id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      supplierId: props.supplierId,
      documentNumber: props.documentNumber.trim(),
      description: props.description.trim(),
      terms: props.terms,
      status: 'OPEN',
      payments: [],
      categoryId: props.categoryId,
      costCenterId: props.costCenterId,
      notes: props.notes,
      version: 1,
    });

    // Emitir evento de criação
    payable.addDomainEvent(new PayableCreatedEvent(props.id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      supplierId: props.supplierId,
      amount: props.terms.amount.amount,
      currency: props.terms.amount.currency,
      dueDate: props.terms.dueDate.toISOString(),
    }));

    return Result.ok(payable);
  }

  /**
   * Registra um pagamento
   * 
   * Aceita pagamentos PENDING ou CONFIRMED.
   * Status do payable só é atualizado baseado em pagamentos CONFIRMED.
   */
  registerPayment(payment: Payment): Result<void, string> {
    // Validar status
    if (this._props.status === 'PAID') {
      return Result.fail(new PayableAlreadyPaidError(this.id).message);
    }

    if (this._props.status === 'CANCELLED') {
      return Result.fail(new PayableCancelledError(this.id).message);
    }

    // Calcular total devido
    const totalDueResult = this._props.terms.calculateTotalDue();
    if (Result.isFail(totalDueResult)) {
      return Result.fail('Could not calculate total due');
    }

    // Calcular total confirmado atual
    const currentConfirmedTotal = this.totalPaid;
    
    // Calcular projeção se este pagamento for confirmado
    const projectedTotal = currentConfirmedTotal.add(payment.amount);
    if (Result.isFail(projectedTotal)) {
      return Result.fail('Could not calculate projected total');
    }

    // Validar que não excede o valor devido
    if (projectedTotal.value.isGreaterThan(totalDueResult.value)) {
      return Result.fail(new OverpaymentError(
        totalDueResult.value.amount,
        projectedTotal.value.amount
      ).message);
    }

    // Registrar pagamento
    this._props.payments.push(payment);

    // Recalcular status baseado SOMENTE em pagamentos confirmados
    this._recalculateStatus();

    this._props.version++;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Confirma um pagamento e recalcula status
   */
  confirmPayment(paymentId: string, transactionId?: string): Result<void, string> {
    const payment = this._props.payments.find(p => p.id === paymentId);
    
    if (!payment) {
      return Result.fail(`Payment ${paymentId} not found`);
    }

    const confirmResult = payment.confirm(transactionId);
    if (Result.isFail(confirmResult)) {
      return Result.fail(confirmResult.error);
    }

    // Recalcular status após confirmação
    this._recalculateStatus();

    this._props.version++;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Cancela um pagamento e recalcula status
   */
  cancelPayment(paymentId: string, reason: string): Result<void, string> {
    const payment = this._props.payments.find(p => p.id === paymentId);
    
    if (!payment) {
      return Result.fail(`Payment ${paymentId} not found`);
    }

    const cancelResult = payment.cancel(reason);
    if (Result.isFail(cancelResult)) {
      return Result.fail(cancelResult.error);
    }

    // Recalcular status após cancelamento
    this._recalculateStatus();

    this._props.version++;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Recalcula status baseado em pagamentos confirmados
   * 
   * Garante consistência: status sempre reflete totalPaid (apenas CONFIRMED)
   */
  private _recalculateStatus(): void {
    if (this._props.status === 'CANCELLED') return;

    const totalDueResult = this._props.terms.calculateTotalDue();
    if (Result.isFail(totalDueResult)) return;

    const confirmedTotal = this.totalPaid;

    if (confirmedTotal.equals(totalDueResult.value) || 
        confirmedTotal.isGreaterThan(totalDueResult.value)) {
      // Só muda para PAID se realmente confirmado
      if (this._props.status !== 'PAID') {
        this._props.status = 'PAID';
        
        // Encontrar último pagamento confirmado para o evento
        const lastConfirmedPayment = [...this._props.payments]
          .reverse()
          .find(p => p.status === 'CONFIRMED');
        
        if (lastConfirmedPayment) {
          this.addDomainEvent(new PaymentCompletedEvent(this.id, {
            paymentId: lastConfirmedPayment.id,
            paidAmount: lastConfirmedPayment.amount.amount,
            paidAt: lastConfirmedPayment.paidAt.toISOString(),
            paymentMethod: lastConfirmedPayment.method,
          }));
        }
      }
    } else if (confirmedTotal.isPositive()) {
      this._props.status = 'PARTIAL';
    } else {
      // Se não há pagamentos confirmados, volta para OPEN (se não estava em PROCESSING)
      if (this._props.status !== 'PROCESSING') {
        this._props.status = 'OPEN';
      }
    }
  }

  /**
   * Cancela a conta a pagar
   * 
   * INVARIANTE: Não pode cancelar se há pagamentos CONFIRMED.
   * Fluxo correto: estornar pagamentos primeiro, depois cancelar.
   */
  cancel(reason: string, cancelledBy: string): Result<void, string> {
    if (this._props.status === 'PAID') {
      return Result.fail('Cannot cancel paid payable');
    }

    if (this._props.status === 'CANCELLED') {
      return Result.fail('Payable already cancelled');
    }

    if (this._props.status === 'PROCESSING') {
      return Result.fail(new PayableInProcessingError(this.id).message);
    }

    // INVARIANTE: Não pode cancelar com pagamentos confirmados
    const confirmedPayments = this._props.payments.filter(p => p.status === 'CONFIRMED');
    if (confirmedPayments.length > 0) {
      return Result.fail(
        `Cannot cancel payable with ${confirmedPayments.length} confirmed payment(s). ` +
        `Total confirmed: ${this.totalPaid.format()}. Reverse payments first.`
      );
    }

    // ===================================================================
    // TWO-PHASE COMMIT PATTERN (P-ATOMIC-OPERATION-001)
    // ===================================================================
    // Garante atomicidade: TODOS payments cancelados OU NENHUM
    // Previne dados órfãos: payments CANCELLED com payable PENDING
    // ===================================================================

    const pendingPayments = this._props.payments.filter(p => p.status === 'PENDING');

    // ===================================================================
    // FASE 1: VALIDAÇÃO (SEM MUTAÇÃO)
    // ===================================================================
    // Verifica que TODOS os payments podem ser cancelados ANTES de mutar qualquer um
    
    const validationErrors: Array<{ paymentId: string; error: string }> = [];
    
    for (const payment of pendingPayments) {
      const canCancelResult = payment.canCancel(); // ✅ NÃO muta!
      
      if (Result.isFail(canCancelResult)) {
        validationErrors.push({
          paymentId: payment.id,
          error: canCancelResult.error,
        });
      }
    }
    
    // ✅ Se ALGUMA validação falhou, abortar SEM mutar nada
    if (validationErrors.length > 0) {
      const errorDetails = validationErrors
        .map(e => `Payment ${e.paymentId}: ${e.error}`)
        .join('; ');
      
      return Result.fail(
        `Cannot cancel payable - ${validationErrors.length} payment(s) in invalid state: ${errorDetails}. ` +
        `Payable: ${this.id}. No changes were made (atomic operation).`
      );
    }

    // ===================================================================
    // FASE 2: EXECUÇÃO (COM MUTAÇÃO)
    // ===================================================================
    // Neste ponto, SABEMOS que todos podem ser cancelados (validado na Fase 1)
    
    const cancellationErrors: Array<{ paymentId: string; error: string }> = [];
    
    for (const payment of pendingPayments) {
      const cancelResult = payment.cancel('Payable cancelled');
      
      if (Result.isFail(cancelResult)) {
        // ❌ Isso NÃO deveria acontecer (validamos na Fase 1)
        // Se acontecer, é BUG no código ou invariante violado
        cancellationErrors.push({
          paymentId: payment.id,
          error: cancelResult.error,
        });
      }
    }
    
    // ❌ Se ALGUM erro na execução, é invariante violado (BUG)
    // ⚠️ S1.3: Convertido de throw para Result.fail() (DOMAIN-SVC-004)
    if (cancellationErrors.length > 0) {
      const errorDetails = cancellationErrors
        .map(e => `Payment ${e.paymentId}: ${e.error}`)
        .join('; ');
      
      return Result.fail(
        `[INVARIANT VIOLATION] Payment cancellation failed after validation passed. ` +
        `This indicates a bug in the cancellation logic or race condition. ` +
        `Failed payments: ${errorDetails}. ` +
        `Payable: ${this.id}. ` +
        `State is now inconsistent and requires manual investigation.`
      );
    }

    // ===================================================================
    // FASE 3: ATUALIZAÇÃO DO AGGREGATE
    // ===================================================================
    // Se chegou aqui, TODOS payments foram cancelados com sucesso (atomicamente)

    this._props.status = 'CANCELLED';
    this._props.version++;
    this.touch();

    // Emitir evento
    this.addDomainEvent(new PayableCancelledEvent(this.id, {
      cancelledAt: new Date().toISOString(),
      reason,
      cancelledBy,
    }));

    return Result.ok(undefined);
  }

  /**
   * Marca como em processamento (ex: remessa gerada)
   */
  markAsProcessing(): Result<void, string> {
    if (this._props.status !== 'OPEN' && this._props.status !== 'PARTIAL') {
      return Result.fail(`Cannot mark as processing from status ${this._props.status}`);
    }

    this._props.status = 'PROCESSING';
    this._props.version++;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Reconstrói do banco de dados
   */
  static reconstitute(
    id: string,
    props: AccountPayableProps,
    createdAt: Date,
    updatedAt: Date
  ): AccountPayable {
    const payable = new AccountPayable(id, props, createdAt);
    payable._updatedAt = updatedAt;
    return payable;
  }
}

