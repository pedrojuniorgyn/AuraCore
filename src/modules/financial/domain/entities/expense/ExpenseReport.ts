import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { ExpenseItem } from './ExpenseItem';
import { Advance } from '../../value-objects/expense/Advance';
import { 
  ExpenseReportStatus, 
  canTransitionToExpenseReportStatus,
  isValidExpenseReportStatus,
} from '../../value-objects/expense/ExpenseReportStatus';

/**
 * Props do ExpenseReport
 */
export interface ExpenseReportProps {
  id: string;
  organizationId: number;
  branchId: number;
  
  employeeId: string;
  employeeName: string;
  costCenterId: string;
  
  periodoInicio: Date;
  periodoFim: Date;
  motivo: string;
  projeto?: string;
  
  advance?: Advance;
  
  items: ExpenseItem[];
  
  totalDespesas: Money;
  saldo: Money;
  
  status: ExpenseReportStatus;
  
  submittedAt?: Date;
  reviewerId?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  
  payableId?: string;
  
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Aggregate Root: Relatório de Despesas
 * 
 * Gerencia o ciclo de vida completo de um relatório de despesas,
 * desde a criação até o pagamento do reembolso.
 */
export class ExpenseReport {
  private constructor(
    private _props: ExpenseReportProps,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  // Getters
  get id(): string {
    return this._props.id;
  }

  get organizationId(): number {
    return this._props.organizationId;
  }

  get branchId(): number {
    return this._props.branchId;
  }

  get employeeId(): string {
    return this._props.employeeId;
  }

  get employeeName(): string {
    return this._props.employeeName;
  }

  get costCenterId(): string {
    return this._props.costCenterId;
  }

  get periodoInicio(): Date {
    return this._props.periodoInicio;
  }

  get periodoFim(): Date {
    return this._props.periodoFim;
  }

  get motivo(): string {
    return this._props.motivo;
  }

  get projeto(): string | undefined {
    return this._props.projeto;
  }

  get advance(): Advance | undefined {
    return this._props.advance;
  }

  get items(): readonly ExpenseItem[] {
    return this._props.items;
  }

  get totalDespesas(): Money {
    return this._props.totalDespesas;
  }

  get saldo(): Money {
    return this._props.saldo;
  }

  get status(): ExpenseReportStatus {
    return this._props.status;
  }

  get submittedAt(): Date | undefined {
    return this._props.submittedAt;
  }

  get reviewerId(): string | undefined {
    return this._props.reviewerId;
  }

  get reviewedAt(): Date | undefined {
    return this._props.reviewedAt;
  }

  get reviewNotes(): string | undefined {
    return this._props.reviewNotes;
  }

  get payableId(): string | undefined {
    return this._props.payableId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get createdBy(): string {
    return this._props.createdBy;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get updatedBy(): string {
    return this._props.updatedBy;
  }

  /**
   * Cria um novo relatório de despesas (status DRAFT)
   */
  static create(
    props: Omit<
      ExpenseReportProps,
      'items' | 'totalDespesas' | 'saldo' | 'status' | 'createdAt' | 'updatedAt'
    >
  ): Result<ExpenseReport, string> {
    // Validações de IDs
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Expense Report ID is required');
    }

    if (props.organizationId <= 0) {
      return Result.fail('Organization ID must be greater than 0');
    }

    if (props.branchId <= 0) {
      return Result.fail('Branch ID must be greater than 0');
    }

    if (!props.employeeId || props.employeeId.trim() === '') {
      return Result.fail('Employee ID is required');
    }

    if (!props.employeeName || props.employeeName.trim() === '') {
      return Result.fail('Employee name is required');
    }

    if (!props.costCenterId || props.costCenterId.trim() === '') {
      return Result.fail('Cost Center ID is required');
    }

    // Validações de período
    if (props.periodoFim < props.periodoInicio) {
      return Result.fail('Período fim must be greater than or equal to período início');
    }

    if (!props.motivo || props.motivo.trim() === '') {
      return Result.fail('Motivo is required');
    }

    const now = new Date();
    const zeroBRL = Money.create(0, 'BRL');
    if (Result.isFail(zeroBRL)) {
      return Result.fail(zeroBRL.error);
    }

    const report = new ExpenseReport(
      {
        ...props,
        items: [],
        totalDespesas: zeroBRL.value,
        saldo: zeroBRL.value,
        status: 'DRAFT',
        createdAt: now,
        updatedAt: now,
      },
      now,
      now
    );

    return Result.ok(report);
  }

  /**
   * Reconstitui relatório do banco
   */
  static reconstitute(
    props: ExpenseReportProps,
    createdAt: Date,
    updatedAt: Date
  ): Result<ExpenseReport, string> {
    // Validações mínimas
    if (!props.id || props.id.trim() === '') {
      return Result.fail('ExpenseReport id is required for reconstitution');
    }

    if (props.organizationId <= 0) {
      return Result.fail('Organization ID must be greater than 0');
    }

    if (props.branchId <= 0) {
      return Result.fail('Branch ID must be greater than 0');
    }

    // Validar status
    if (!isValidExpenseReportStatus(props.status)) {
      return Result.fail(`Invalid status: ${props.status}`);
    }

    const report = new ExpenseReport(props, createdAt, updatedAt);
    return Result.ok(report);
  }

  /**
   * Adiciona item de despesa
   */
  addItem(item: ExpenseItem): Result<void, string> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(`Cannot add item: report is ${this._props.status}`);
    }

    this._props.items = [...this._props.items, item];
    this.calculateTotals();
    this._updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Remove item de despesa
   */
  removeItem(itemId: string): Result<void, string> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(`Cannot remove item: report is ${this._props.status}`);
    }

    const index = this._props.items.findIndex((i) => i.id === itemId);
    if (index === -1) {
      return Result.fail(`Item ${itemId} not found`);
    }

    this._props.items = this._props.items.filter((i) => i.id !== itemId);
    this.calculateTotals();
    this._updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Solicita adiantamento
   */
  requestAdvance(valor: Money): Result<void, string> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail(`Cannot request advance: report is ${this._props.status}`);
    }

    if (this._props.advance) {
      return Result.fail('Advance already requested');
    }

    const advanceResult = Advance.create(valor, new Date());
    if (Result.isFail(advanceResult)) {
      return Result.fail(advanceResult.error);
    }

    this._props.advance = advanceResult.value;
    this.calculateTotals();
    this._updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Aprova adiantamento
   */
  approveAdvance(valorAprovado: Money, aprovadorId: string): Result<void, string> {
    if (!this._props.advance) {
      return Result.fail('No advance to approve');
    }

    const approvedResult = this._props.advance.approve(valorAprovado, aprovadorId);
    if (Result.isFail(approvedResult)) {
      return Result.fail(approvedResult.error);
    }

    this._props.advance = approvedResult.value;
    this.calculateTotals();
    this._updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Submete para aprovação
   */
  submit(): Result<void, string> {
    if (!canTransitionToExpenseReportStatus(this._props.status, 'SUBMITTED')) {
      return Result.fail(`Cannot submit: invalid status transition from ${this._props.status}`);
    }

    if (this._props.items.length === 0) {
      return Result.fail('Cannot submit empty expense report');
    }

    this._props.status = 'SUBMITTED';
    this._props.submittedAt = new Date();
    this._updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Aprova relatório
   */
  approve(reviewerId: string, notes?: string): Result<void, string> {
    if (!canTransitionToExpenseReportStatus(this._props.status, 'APPROVED')) {
      return Result.fail(`Cannot approve: invalid status transition from ${this._props.status}`);
    }

    if (!reviewerId || reviewerId.trim() === '') {
      return Result.fail('Reviewer ID is required');
    }

    this._props.status = 'APPROVED';
    this._props.reviewerId = reviewerId;
    this._props.reviewedAt = new Date();
    this._props.reviewNotes = notes;
    this._updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Rejeita relatório
   */
  reject(reviewerId: string, notes: string): Result<void, string> {
    if (!canTransitionToExpenseReportStatus(this._props.status, 'REJECTED')) {
      return Result.fail(`Cannot reject: invalid status transition from ${this._props.status}`);
    }

    if (!reviewerId || reviewerId.trim() === '') {
      return Result.fail('Reviewer ID is required');
    }

    if (!notes || notes.trim().length < 10) {
      return Result.fail('Review notes must have at least 10 characters');
    }

    this._props.status = 'REJECTED';
    this._props.reviewerId = reviewerId;
    this._props.reviewedAt = new Date();
    this._props.reviewNotes = notes;
    this._updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Vincula título no Contas a Pagar
   */
  linkPayable(payableId: string): Result<void, string> {
    if (this._props.status !== 'APPROVED') {
      return Result.fail('Can only link payable to approved reports');
    }

    if (!payableId || payableId.trim() === '') {
      return Result.fail('Payable ID is required');
    }

    this._props.payableId = payableId;
    this._updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Marca como pago
   */
  markAsPaid(): Result<void, string> {
    if (!canTransitionToExpenseReportStatus(this._props.status, 'PAID')) {
      return Result.fail(`Cannot mark as paid: invalid status transition from ${this._props.status}`);
    }

    this._props.status = 'PAID';
    this._updatedAt = new Date();

    return Result.ok(undefined);
  }

  /**
   * Calcula totais e saldo
   * Saldo = Total Despesas - Adiantamento Aprovado
   * Saldo positivo = reembolso ao colaborador
   * Saldo negativo = colaborador deve devolver
   */
  private calculateTotals(): void {
    // Total de despesas
    // Money.create(0, 'BRL') é garantido sucesso para valor 0
    const zeroMoneyResult = Money.create(0, 'BRL');
    if (Result.isFail(zeroMoneyResult)) {
      // Fallback: se falhar, usar erro (não deve acontecer com valor 0)
      throw new Error('Failed to create zero money for calculation');
    }

    const totalResult = this._props.items.reduce((acc, item) => {
      const addResult = acc.add(item.valor);
      return Result.isOk(addResult) ? addResult.value : acc;
    }, zeroMoneyResult.value);

    this._props.totalDespesas = totalResult;

    // Saldo
    if (this._props.advance && this._props.advance.statusAprovacao === 'APPROVED') {
      const advanceAmount = this._props.advance.valorAprovado || this._props.advance.valorSolicitado;
      const saldoResult = totalResult.subtract(advanceAmount);
      this._props.saldo = Result.isOk(saldoResult) ? saldoResult.value : totalResult;
    } else {
      this._props.saldo = totalResult;
    }
  }
}

