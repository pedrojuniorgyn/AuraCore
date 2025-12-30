import { Result } from '@/shared/domain';
import { RomaneioItem, RomaneioItemProps } from './RomaneioItem';
import {
  RomaneioStatus,
  canTransitionToStatus,
  createRomaneioStatus,
} from '../value-objects/RomaneioStatus';

/**
 * Props do Romaneio de Carga
 */
export interface RomaneioDocumentProps {
  id: string;
  organizationId: number;
  branchId: number;
  
  // Identificação
  numero: string;
  dataEmissao: Date;
  
  // Partes (IDs de Business Partner)
  remetenteId: string;
  destinatarioId: string;
  transportadorId?: string;
  
  // Vinculações TMS (opcionais)
  tripId?: string;
  deliveryId?: string;
  
  // Documentos fiscais vinculados
  cteNumbers: string[];
  nfeNumbers: string[];
  
  // Totais (calculados dos itens)
  totalVolumes: number;
  pesoLiquidoTotal: number;   // kg (decimal 10,3)
  pesoBrutoTotal: number;     // kg (decimal 10,3)
  cubagemTotal: number;       // m³ (decimal 10,6)
  
  // Status
  status: RomaneioStatus;
  
  // Itens
  items: RomaneioItem[];
  
  // Conferência (preenchido na entrega)
  conferidoPor?: string;
  dataConferencia?: Date;
  observacoesConferencia?: string;
  
  // Auditoria
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Aggregate Root: Romaneio de Carga (Packing List)
 * 
 * Documento logístico que discrimina todas as mercadorias embarcadas
 * em uma viagem/entrega. Usado para conferência de embarque/desembarque
 * e fiscalização em postos/fronteiras.
 * 
 * IMPORTANTE:
 * - Romaneio NÃO é documento fiscal
 * - Não contém valores financeiros
 * - Complementa CT-e e NF-e, não os substitui
 * - Obrigatório para importação/exportação (Receita Federal)
 * 
 * Regras de Negócio:
 * - Totais calculados automaticamente dos itens
 * - Não pode ser emitido sem itens
 * - Só pode ser conferido após emissão
 * - Não pode ser cancelado após entrega
 */
export class RomaneioDocument {
  private constructor(
    private readonly _props: RomaneioDocumentProps,
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

  get numero(): string {
    return this._props.numero;
  }

  get dataEmissao(): Date {
    return this._props.dataEmissao;
  }

  get remetenteId(): string {
    return this._props.remetenteId;
  }

  get destinatarioId(): string {
    return this._props.destinatarioId;
  }

  get transportadorId(): string | undefined {
    return this._props.transportadorId;
  }

  get tripId(): string | undefined {
    return this._props.tripId;
  }

  get deliveryId(): string | undefined {
    return this._props.deliveryId;
  }

  get cteNumbers(): string[] {
    return this._props.cteNumbers;
  }

  get nfeNumbers(): string[] {
    return this._props.nfeNumbers;
  }

  get totalVolumes(): number {
    return this._props.totalVolumes;
  }

  get pesoLiquidoTotal(): number {
    return this._props.pesoLiquidoTotal;
  }

  get pesoBrutoTotal(): number {
    return this._props.pesoBrutoTotal;
  }

  get cubagemTotal(): number {
    return this._props.cubagemTotal;
  }

  get status(): RomaneioStatus {
    return this._props.status;
  }

  get items(): RomaneioItem[] {
    return this._props.items;
  }

  get conferidoPor(): string | undefined {
    return this._props.conferidoPor;
  }

  get dataConferencia(): Date | undefined {
    return this._props.dataConferencia;
  }

  get observacoesConferencia(): string | undefined {
    return this._props.observacoesConferencia;
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
   * Cria um novo romaneio (status DRAFT)
   */
  static create(
    props: Omit<
      RomaneioDocumentProps,
      'totalVolumes' | 'pesoLiquidoTotal' | 'pesoBrutoTotal' | 'cubagemTotal' | 'items' | 'status' | 'createdAt' | 'updatedAt'
    >
  ): Result<RomaneioDocument, string> {
    // Validações de IDs
    if (!props.id || props.id.trim() === '') {
      return Result.fail('Romaneio ID is required');
    }

    if (props.organizationId <= 0) {
      return Result.fail('Organization ID must be greater than 0');
    }

    if (props.branchId <= 0) {
      return Result.fail('Branch ID must be greater than 0');
    }

    if (!props.remetenteId || props.remetenteId.trim() === '') {
      return Result.fail('Remetente ID is required');
    }

    if (!props.destinatarioId || props.destinatarioId.trim() === '') {
      return Result.fail('Destinatário ID is required');
    }

    if (!props.numero || props.numero.trim() === '') {
      return Result.fail('Número is required');
    }

    const now = new Date();
    const romaneio = new RomaneioDocument(
      {
        ...props,
        status: 'DRAFT',
        items: [],
        cteNumbers: props.cteNumbers || [],
        nfeNumbers: props.nfeNumbers || [],
        totalVolumes: 0,
        pesoLiquidoTotal: 0,
        pesoBrutoTotal: 0,
        cubagemTotal: 0,
        createdAt: now,
        updatedAt: now,
      },
      now,
      now
    );

    return Result.ok(romaneio);
  }

  /**
   * Reconstitui romaneio do banco de dados
   * Usado pelo Mapper
   */
  static reconstitute(
    props: RomaneioDocumentProps,
    createdAt: Date,
    updatedAt: Date
  ): Result<RomaneioDocument, string> {
    // Validações mínimas na reconstituição
    if (!props.id) {
      return Result.fail('Romaneio ID is required');
    }

    const statusResult = createRomaneioStatus(props.status);
    if (Result.isFail(statusResult)) {
      return Result.fail(statusResult.error);
    }

    const romaneio = new RomaneioDocument(props, createdAt, updatedAt);
    return Result.ok(romaneio);
  }

  /**
   * Adiciona item ao romaneio
   * Recalcula totais automaticamente
   */
  addItem(item: RomaneioItem): Result<void, string> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail('Cannot add items to romaneio that is not in DRAFT status');
    }

    // Adicionar item
    this._props.items.push(item);
    
    // Recalcular totais
    this.calculateTotals();
    
    this._updatedAt = new Date();
    this._props.updatedAt = this._updatedAt;

    return Result.ok(undefined);
  }

  /**
   * Remove item do romaneio
   * Recalcula totais automaticamente
   */
  removeItem(itemId: string): Result<void, string> {
    if (this._props.status !== 'DRAFT') {
      return Result.fail('Cannot remove items from romaneio that is not in DRAFT status');
    }

    const index = this._props.items.findIndex((i) => i.id === itemId);
    if (index === -1) {
      return Result.fail(`Item with ID ${itemId} not found`);
    }

    // Remover item
    this._props.items.splice(index, 1);
    
    // Recalcular totais
    this.calculateTotals();
    
    this._updatedAt = new Date();
    this._props.updatedAt = this._updatedAt;

    return Result.ok(undefined);
  }

  /**
   * Emite o romaneio (DRAFT → EMITTED)
   * Valida que possui itens
   */
  emit(): Result<void, string> {
    if (!canTransitionToStatus(this._props.status, 'EMITTED')) {
      return Result.fail(`Cannot emit romaneio from status ${this._props.status}`);
    }

    if (this._props.items.length === 0) {
      return Result.fail('Cannot emit romaneio without items');
    }

    this._props.status = 'EMITTED';
    this._updatedAt = new Date();
    this._props.updatedAt = this._updatedAt;

    return Result.ok(undefined);
  }

  /**
   * Registra conferência de entrega (EMITTED → DELIVERED)
   */
  registerConference(params: {
    conferidoPor: string;
    observacoes?: string;
  }): Result<void, string> {
    if (!canTransitionToStatus(this._props.status, 'DELIVERED')) {
      return Result.fail(`Cannot register conference from status ${this._props.status}`);
    }

    if (!params.conferidoPor || params.conferidoPor.trim() === '') {
      return Result.fail('Conferido por is required');
    }

    this._props.status = 'DELIVERED';
    this._props.conferidoPor = params.conferidoPor;
    this._props.dataConferencia = new Date();
    this._props.observacoesConferencia = params.observacoes;
    
    this._updatedAt = new Date();
    this._props.updatedAt = this._updatedAt;

    return Result.ok(undefined);
  }

  /**
   * Cancela o romaneio
   * Só pode cancelar de DRAFT ou EMITTED
   */
  cancel(): Result<void, string> {
    if (!canTransitionToStatus(this._props.status, 'CANCELLED')) {
      return Result.fail(`Cannot cancel romaneio from status ${this._props.status}`);
    }

    this._props.status = 'CANCELLED';
    this._updatedAt = new Date();
    this._props.updatedAt = this._updatedAt;

    return Result.ok(undefined);
  }

  /**
   * Calcula totais com base nos itens
   */
  calculateTotals(): void {
    this._props.totalVolumes = this._props.items.reduce(
      (sum, item) => sum + item.quantidade,
      0
    );

    this._props.pesoLiquidoTotal = this._props.items.reduce(
      (sum, item) => sum + item.pesoLiquido * item.quantidade,
      0
    );

    this._props.pesoBrutoTotal = this._props.items.reduce(
      (sum, item) => sum + item.pesoBruto * item.quantidade,
      0
    );

    this._props.cubagemTotal = this._props.items.reduce(
      (sum, item) => sum + item.cubagem * item.quantidade,
      0
    );
  }
}

