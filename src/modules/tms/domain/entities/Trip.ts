/**
 * Trip Entity - Aggregate Root
 * 
 * Representa uma viagem no sistema TMS.
 */
import { AggregateRoot, Result, Money } from '@/shared/domain';
import { TripStatus, type TripStatusType } from '../value-objects/TripStatus';
import { DriverType, type DriverTypeValue } from '../value-objects/DriverType';

interface TripProps {
  organizationId: number;
  branchId: number;
  tripNumber: string;
  
  // Alocação
  vehicleId: number;
  driverId: number;
  driverType: DriverType;
  trailer1Id: number | null;
  trailer2Id: number | null;
  
  // Ordens de coleta (JSON array)
  pickupOrderIds: number[];
  
  // Datas
  scheduledStart: Date | null;
  actualStart: Date | null;
  scheduledEnd: Date | null;
  actualEnd: Date | null;
  
  // Fiscal
  mdfeId: number | null;
  mdfeStatus: string | null;
  
  // CIOT
  requiresCiot: boolean;
  ciotNumber: string | null;
  ciotValue: Money | null;
  ciotIssuedAt: Date | null;
  
  // Status
  status: TripStatus;
  
  // Financeiro
  estimatedRevenue: Money | null;
  actualRevenue: Money | null;
  estimatedCost: Money | null;
  actualCost: Money | null;
  
  // Observações
  notes: string | null;
  
  // Enterprise Base
  createdBy: string;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  version: number;
}

export interface CreateTripProps {
  organizationId: number;
  branchId: number;
  vehicleId: number;
  driverId: number;
  driverType?: DriverTypeValue;
  trailer1Id?: number | null;
  trailer2Id?: number | null;
  pickupOrderIds?: number[];
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  estimatedRevenue?: number;
  estimatedCost?: number;
  notes?: string;
  createdBy: string;
}

export class Trip extends AggregateRoot<number> {
  private readonly props: TripProps;

  private constructor(id: number, props: TripProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get tripNumber(): string { return this.props.tripNumber; }
  get vehicleId(): number { return this.props.vehicleId; }
  get driverId(): number { return this.props.driverId; }
  get driverType(): DriverType { return this.props.driverType; }
  get trailer1Id(): number | null { return this.props.trailer1Id; }
  get trailer2Id(): number | null { return this.props.trailer2Id; }
  get pickupOrderIds(): number[] { return [...this.props.pickupOrderIds]; }
  get scheduledStart(): Date | null { return this.props.scheduledStart; }
  get actualStart(): Date | null { return this.props.actualStart; }
  get scheduledEnd(): Date | null { return this.props.scheduledEnd; }
  get actualEnd(): Date | null { return this.props.actualEnd; }
  get mdfeId(): number | null { return this.props.mdfeId; }
  get mdfeStatus(): string | null { return this.props.mdfeStatus; }
  get requiresCiot(): boolean { return this.props.requiresCiot; }
  get ciotNumber(): string | null { return this.props.ciotNumber; }
  get ciotValue(): Money | null { return this.props.ciotValue; }
  get ciotIssuedAt(): Date | null { return this.props.ciotIssuedAt; }
  get status(): TripStatus { return this.props.status; }
  get estimatedRevenue(): Money | null { return this.props.estimatedRevenue; }
  get actualRevenue(): Money | null { return this.props.actualRevenue; }
  get estimatedCost(): Money | null { return this.props.estimatedCost; }
  get actualCost(): Money | null { return this.props.actualCost; }
  get notes(): string | null { return this.props.notes; }
  get createdBy(): string { return this.props.createdBy; }
  get updatedBy(): string | null { return this.props.updatedBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get version(): number { return this.props.version; }

  /**
   * Factory method: create() COM validações
   */
  static create(props: CreateTripProps): Result<Trip, string> {
    // Validações
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('organizationId é obrigatório e deve ser maior que 0');
    }
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('branchId é obrigatório e deve ser maior que 0');
    }
    if (!props.vehicleId || props.vehicleId <= 0) {
      return Result.fail('vehicleId é obrigatório');
    }
    if (!props.driverId || props.driverId <= 0) {
      return Result.fail('driverId é obrigatório');
    }
    if (!props.createdBy?.trim()) {
      return Result.fail('createdBy é obrigatório');
    }

    // Parse DriverType
    const driverTypeValue = props.driverType || 'OWN';
    const driverTypeResult = DriverType.create(driverTypeValue);
    if (Result.isFail(driverTypeResult)) {
      return Result.fail(driverTypeResult.error);
    }

    // Gerar número da viagem
    const now = new Date();
    const year = now.getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const tripNumber = `VIA-${year}-${random}`;

    // Verifica se CIOT é necessário
    const requiresCiot = driverTypeResult.value.requiresCiot;

    // Parse Money values
    let estimatedRevenue: Money | null = null;
    let estimatedCost: Money | null = null;

    if (props.estimatedRevenue !== undefined && props.estimatedRevenue > 0) {
      const revenueResult = Money.create(props.estimatedRevenue, 'BRL');
      if (Result.isOk(revenueResult)) {
        estimatedRevenue = revenueResult.value;
      }
    }

    if (props.estimatedCost !== undefined && props.estimatedCost > 0) {
      const costResult = Money.create(props.estimatedCost, 'BRL');
      if (Result.isOk(costResult)) {
        estimatedCost = costResult.value;
      }
    }

    // ID será gerado pelo banco (identity)
    const id = 0;

    const trip = new Trip(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      tripNumber,
      vehicleId: props.vehicleId,
      driverId: props.driverId,
      driverType: driverTypeResult.value,
      trailer1Id: props.trailer1Id ?? null,
      trailer2Id: props.trailer2Id ?? null,
      pickupOrderIds: props.pickupOrderIds ?? [],
      scheduledStart: props.scheduledStart ?? null,
      actualStart: null,
      scheduledEnd: props.scheduledEnd ?? null,
      actualEnd: null,
      mdfeId: null,
      mdfeStatus: null,
      requiresCiot,
      ciotNumber: null,
      ciotValue: null,
      ciotIssuedAt: null,
      status: TripStatus.draft(),
      estimatedRevenue,
      actualRevenue: null,
      estimatedCost,
      actualCost: null,
      notes: props.notes?.trim() ?? null,
      createdBy: props.createdBy.trim(),
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    }, now);

    return Result.ok(trip);
  }

  /**
   * Factory method: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: TripProps & { id: number }): Result<Trip, string> {
    return Result.ok(new Trip(props.id, props, props.createdAt));
  }

  /**
   * Aloca motorista e veículo
   */
  allocate(vehicleId: number, driverId: number, driverType: DriverTypeValue, updatedBy: string): Result<void, string> {
    if (!this.props.status.canTransitionTo('ALLOCATED')) {
      return Result.fail(`Não é possível alocar viagem com status ${this.props.status.value}`);
    }

    const driverTypeResult = DriverType.create(driverType);
    if (Result.isFail(driverTypeResult)) {
      return Result.fail(driverTypeResult.error);
    }

    (this.props as { vehicleId: number }).vehicleId = vehicleId;
    (this.props as { driverId: number }).driverId = driverId;
    (this.props as { driverType: DriverType }).driverType = driverTypeResult.value;
    (this.props as { requiresCiot: boolean }).requiresCiot = driverTypeResult.value.requiresCiot;
    (this.props as { status: TripStatus }).status = TripStatus.allocated();
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Inicia a viagem
   */
  start(updatedBy: string): Result<void, string> {
    if (!this.props.status.canTransitionTo('IN_TRANSIT')) {
      return Result.fail(`Não é possível iniciar viagem com status ${this.props.status.value}`);
    }

    // Verifica CIOT se necessário
    if (this.props.requiresCiot && !this.props.ciotNumber) {
      return Result.fail('CIOT é obrigatório para motoristas terceiros/agregados');
    }

    (this.props as { status: TripStatus }).status = TripStatus.inTransit();
    (this.props as { actualStart: Date | null }).actualStart = new Date();
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Completa a viagem
   */
  complete(actualRevenue: number | null, actualCost: number | null, updatedBy: string): Result<void, string> {
    if (!this.props.status.canTransitionTo('COMPLETED')) {
      return Result.fail(`Não é possível completar viagem com status ${this.props.status.value}`);
    }

    let revenue: Money | null = null;
    let cost: Money | null = null;

    if (actualRevenue !== null && actualRevenue > 0) {
      const revenueResult = Money.create(actualRevenue, 'BRL');
      if (Result.isOk(revenueResult)) {
        revenue = revenueResult.value;
      }
    }

    if (actualCost !== null && actualCost > 0) {
      const costResult = Money.create(actualCost, 'BRL');
      if (Result.isOk(costResult)) {
        cost = costResult.value;
      }
    }

    (this.props as { status: TripStatus }).status = TripStatus.completed();
    (this.props as { actualEnd: Date | null }).actualEnd = new Date();
    (this.props as { actualRevenue: Money | null }).actualRevenue = revenue;
    (this.props as { actualCost: Money | null }).actualCost = cost;
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Cancela a viagem
   */
  cancel(reason: string, updatedBy: string): Result<void, string> {
    if (!this.props.status.canTransitionTo('CANCELLED')) {
      return Result.fail(`Não é possível cancelar viagem com status ${this.props.status.value}`);
    }

    (this.props as { status: TripStatus }).status = TripStatus.cancelled();
    (this.props as { notes: string | null }).notes = `[CANCELADO] ${reason}`;
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Define CIOT
   */
  setCiot(ciotNumber: string, ciotValue: number, updatedBy: string): Result<void, string> {
    if (!this.props.requiresCiot) {
      return Result.fail('CIOT não é necessário para motoristas próprios');
    }

    if (!ciotNumber?.trim()) {
      return Result.fail('Número do CIOT é obrigatório');
    }

    const ciotMoneyResult = Money.create(ciotValue, 'BRL');
    if (Result.isFail(ciotMoneyResult)) {
      return Result.fail(`Valor do CIOT inválido: ${ciotMoneyResult.error}`);
    }

    (this.props as { ciotNumber: string | null }).ciotNumber = ciotNumber.trim();
    (this.props as { ciotValue: Money | null }).ciotValue = ciotMoneyResult.value;
    (this.props as { ciotIssuedAt: Date | null }).ciotIssuedAt = new Date();
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Vincula MDF-e
   */
  setMdfe(mdfeId: number, updatedBy: string): Result<void, string> {
    (this.props as { mdfeId: number | null }).mdfeId = mdfeId;
    (this.props as { mdfeStatus: string | null }).mdfeStatus = 'PENDING';
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }
}
