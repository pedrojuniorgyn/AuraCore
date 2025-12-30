import { Result } from '@/shared/domain';
import { Money } from '@/shared/domain/value-objects/Money';
import { ReceiptType, isValidReceiptType } from '../../value-objects/receipt/ReceiptType';
import { ReceiptParty } from '../../value-objects/receipt/ReceiptParty';
import { moneyToWords } from '../../value-objects/receipt/MoneyInWords';

/**
 * Forma de pagamento
 */
export type PaymentMethod =
  | 'DINHEIRO'
  | 'PIX'
  | 'TRANSFERENCIA'
  | 'CHEQUE'
  | 'CARTAO'
  | 'BOLETO'
  | 'OUTRO';

/**
 * Lista de todas as formas de pagamento válidas
 */
const VALID_PAYMENT_METHODS: readonly PaymentMethod[] = [
  'DINHEIRO',
  'PIX',
  'TRANSFERENCIA',
  'CHEQUE',
  'CARTAO',
  'BOLETO',
  'OUTRO',
] as const;

/**
 * Verifica se um valor é uma forma de pagamento válida
 */
function isValidPaymentMethod(method: string): method is PaymentMethod {
  return VALID_PAYMENT_METHODS.includes(method as PaymentMethod);
}

/**
 * Status do recibo
 */
export type ReceiptStatus = 'ACTIVE' | 'CANCELLED';

/**
 * Props do Receipt
 */
export interface ReceiptProps {
  id: string;
  organizationId: number;
  branchId: number;
  
  // Numeração
  tipo: ReceiptType;
  numero: number;
  serie: string;
  
  // Partes
  pagador: ReceiptParty;
  recebedor: ReceiptParty;
  
  // Valores
  valor: Money;
  valorPorExtenso: string;
  
  // Detalhes
  descricao: string;
  formaPagamento: PaymentMethod;
  dataRecebimento: Date;
  localRecebimento?: string;
  
  // Vinculações opcionais
  financialTransactionId?: string;
  payableId?: string;
  receivableId?: string;
  tripId?: string;
  expenseReportId?: string;
  
  // Emissão
  emitidoPor: string;
  emitidoEm: Date;
  
  // Cancelamento
  status: ReceiptStatus;
  canceladoEm?: Date;
  canceladoPor?: string;
  motivoCancelamento?: string;
  
  // Auditoria
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Aggregate Root: Recibo
 * 
 * Comprovante de quitação de obrigação financeira.
 * Documento gerencial (não fiscal) que comprova pagamento/recebimento.
 * 
 * Lei 8.846/94 exige emissão em toda prestação de serviço ou venda.
 */
export class Receipt {
  private constructor(
    private _props: ReceiptProps,
    private readonly _createdAt: Date,
    private _updatedAt: Date
  ) {}

  // Getters principais
  get id(): string {
    return this._props.id;
  }

  get organizationId(): number {
    return this._props.organizationId;
  }

  get branchId(): number {
    return this._props.branchId;
  }

  get tipo(): ReceiptType {
    return this._props.tipo;
  }

  get numero(): number {
    return this._props.numero;
  }

  get serie(): string {
    return this._props.serie;
  }

  get pagador(): ReceiptParty {
    return this._props.pagador;
  }

  get recebedor(): ReceiptParty {
    return this._props.recebedor;
  }

  get valor(): Money {
    return this._props.valor;
  }

  get valorPorExtenso(): string {
    return this._props.valorPorExtenso;
  }

  get descricao(): string {
    return this._props.descricao;
  }

  get formaPagamento(): PaymentMethod {
    return this._props.formaPagamento;
  }

  get dataRecebimento(): Date {
    return this._props.dataRecebimento;
  }

  get localRecebimento(): string | undefined {
    return this._props.localRecebimento;
  }

  get financialTransactionId(): string | undefined {
    return this._props.financialTransactionId;
  }

  get payableId(): string | undefined {
    return this._props.payableId;
  }

  get receivableId(): string | undefined {
    return this._props.receivableId;
  }

  get tripId(): string | undefined {
    return this._props.tripId;
  }

  get expenseReportId(): string | undefined {
    return this._props.expenseReportId;
  }

  get emitidoPor(): string {
    return this._props.emitidoPor;
  }

  get emitidoEm(): Date {
    return this._props.emitidoEm;
  }

  get status(): ReceiptStatus {
    return this._props.status;
  }

  get canceladoEm(): Date | undefined {
    return this._props.canceladoEm;
  }

  get canceladoPor(): string | undefined {
    return this._props.canceladoPor;
  }

  get motivoCancelamento(): string | undefined {
    return this._props.motivoCancelamento;
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
   * Factory method
   */
  static create(props: {
    id: string;
    organizationId: number;
    branchId: number;
    tipo: ReceiptType;
    numero: number;
    serie: string;
    pagador: ReceiptParty;
    recebedor: ReceiptParty;
    valor: Money;
    descricao: string;
    formaPagamento: PaymentMethod;
    dataRecebimento?: Date;
    localRecebimento?: string;
    financialTransactionId?: string;
    payableId?: string;
    receivableId?: string;
    tripId?: string;
    expenseReportId?: string;
    emitidoPor: string;
    createdBy: string;
  }): Result<Receipt, string> {
    // Validar ID
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Receipt id is required');
    }

    // Validar multi-tenancy
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Organization id is required');
    }

    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Branch id is required');
    }

    // Validar numeração
    if (!props.numero || props.numero <= 0) {
      return Result.fail('Numero must be greater than 0');
    }

    if (!props.serie || props.serie.trim() === '') {
      return Result.fail('Serie is required');
    }

    // Validar partes
    if (!props.pagador) {
      return Result.fail('Pagador is required');
    }

    if (!props.recebedor) {
      return Result.fail('Recebedor is required');
    }

    // Validar valor
    if (!props.valor.isPositive()) {
      return Result.fail('Valor must be positive');
    }

    // Validar descrição
    if (!props.descricao || props.descricao.trim().length < 10) {
      return Result.fail('Descricao must be at least 10 characters');
    }

    // Validar emitidoPor
    if (!props.emitidoPor || props.emitidoPor.trim() === '') {
      return Result.fail('EmitidoPor is required');
    }

    // Validar createdBy
    if (!props.createdBy || props.createdBy.trim() === '') {
      return Result.fail('CreatedBy is required');
    }

    // Gerar valor por extenso
    const valorPorExtenso = moneyToWords(props.valor);

    const now = new Date();

    return Result.ok(new Receipt(
      {
        id: props.id,
        organizationId: props.organizationId,
        branchId: props.branchId,
        tipo: props.tipo,
        numero: props.numero,
        serie: props.serie.trim().toUpperCase(),
        pagador: props.pagador,
        recebedor: props.recebedor,
        valor: props.valor,
        valorPorExtenso,
        descricao: props.descricao.trim(),
        formaPagamento: props.formaPagamento,
        dataRecebimento: props.dataRecebimento || now,
        localRecebimento: props.localRecebimento?.trim(),
        financialTransactionId: props.financialTransactionId,
        payableId: props.payableId,
        receivableId: props.receivableId,
        tripId: props.tripId,
        expenseReportId: props.expenseReportId,
        emitidoPor: props.emitidoPor.trim(),
        emitidoEm: now,
        status: 'ACTIVE',
        createdAt: now,
        createdBy: props.createdBy.trim(),
        updatedAt: now,
        updatedBy: props.createdBy.trim(),
      },
      now,
      now
    ));
  }

  /**
   * Cancela o recibo
   */
  cancel(motivoCancelamento: string, canceladoPor: string): Result<void, string> {
    if (this._props.status === 'CANCELLED') {
      return Result.fail('Receipt is already cancelled');
    }

    if (!motivoCancelamento || motivoCancelamento.trim().length < 10) {
      return Result.fail('Motivo cancelamento must be at least 10 characters');
    }

    if (!canceladoPor || canceladoPor.trim() === '') {
      return Result.fail('CanceladoPor is required');
    }

    const now = new Date();

    this._props.status = 'CANCELLED';
    this._props.canceladoEm = now;
    this._props.canceladoPor = canceladoPor.trim();
    this._props.motivoCancelamento = motivoCancelamento.trim();
    this._props.updatedAt = now;
    this._props.updatedBy = canceladoPor.trim();
    this._updatedAt = now;

    return Result.ok(undefined);
  }

  /**
   * Reconstitui do banco
   */
  static reconstitute(props: ReceiptProps): Result<Receipt, string> {
    // Validar ID
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Receipt id is required for reconstitution');
    }

    // Validar multi-tenancy
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('Organization id is required for reconstitution');
    }

    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('Branch id is required for reconstitution');
    }

    // Validar tipo
    if (!isValidReceiptType(props.tipo)) {
      return Result.fail(`Invalid receipt type: ${props.tipo}`);
    }

    // Validar formaPagamento
    if (!isValidPaymentMethod(props.formaPagamento)) {
      return Result.fail(`Invalid forma pagamento: ${props.formaPagamento}`);
    }

    // Validar status
    if (props.status !== 'ACTIVE' && props.status !== 'CANCELLED') {
      return Result.fail(`Invalid receipt status: ${props.status}`);
    }

    return Result.ok(new Receipt(props, props.createdAt, props.updatedAt));
  }

  /**
   * Retorna número completo formatado
   */
  getNumeroCompleto(): string {
    return `${this._props.serie}-${this._props.numero.toString().padStart(6, '0')}`;
  }

  /**
   * Verifica se está ativo
   */
  isActive(): boolean {
    return this._props.status === 'ACTIVE';
  }

  /**
   * Verifica se está cancelado
   */
  isCancelled(): boolean {
    return this._props.status === 'CANCELLED';
  }
}

