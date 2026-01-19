/**
 * Vehicle Entity - Aggregate Root
 * 
 * Representa um veículo no sistema TMS.
 */
import { AggregateRoot, Result } from '@/shared/domain';
import { VehicleStatus, type VehicleStatusType } from '../value-objects/VehicleStatus';

interface VehicleProps {
  organizationId: number;
  branchId: number;
  
  // Identificação
  plate: string;
  renavam: string | null;
  chassis: string | null;
  
  // Tipo e dados
  type: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  
  // Capacidades
  capacityKg: number;
  capacityM3: number;
  taraKg: number;
  
  // Controle Operacional
  status: VehicleStatus;
  currentKm: number;
  
  // Manutenção
  maintenanceStatus: string;
  lastMaintenanceDate: Date | null;
  nextMaintenanceKm: number | null;
  
  // Documentação
  licensePlateExpiry: Date | null;
  insuranceExpiry: Date | null;
  
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

export interface CreateVehicleProps {
  organizationId: number;
  branchId: number;
  plate: string;
  renavam?: string;
  chassis?: string;
  type: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  capacityKg?: number;
  capacityM3?: number;
  taraKg?: number;
  currentKm?: number;
  licensePlateExpiry?: Date;
  insuranceExpiry?: Date;
  notes?: string;
  createdBy: string;
}

export class Vehicle extends AggregateRoot<number> {
  private readonly props: VehicleProps;

  private constructor(id: number, props: VehicleProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get plate(): string { return this.props.plate; }
  get renavam(): string | null { return this.props.renavam; }
  get chassis(): string | null { return this.props.chassis; }
  get type(): string { return this.props.type; }
  get brand(): string | null { return this.props.brand; }
  get model(): string | null { return this.props.model; }
  get year(): number | null { return this.props.year; }
  get color(): string | null { return this.props.color; }
  get capacityKg(): number { return this.props.capacityKg; }
  get capacityM3(): number { return this.props.capacityM3; }
  get taraKg(): number { return this.props.taraKg; }
  get status(): VehicleStatus { return this.props.status; }
  get currentKm(): number { return this.props.currentKm; }
  get maintenanceStatus(): string { return this.props.maintenanceStatus; }
  get lastMaintenanceDate(): Date | null { return this.props.lastMaintenanceDate; }
  get nextMaintenanceKm(): number | null { return this.props.nextMaintenanceKm; }
  get licensePlateExpiry(): Date | null { return this.props.licensePlateExpiry; }
  get insuranceExpiry(): Date | null { return this.props.insuranceExpiry; }
  get notes(): string | null { return this.props.notes; }
  get createdBy(): string { return this.props.createdBy; }
  get updatedBy(): string | null { return this.props.updatedBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get version(): number { return this.props.version; }

  /**
   * Verifica se licenciamento está vencido
   */
  get isLicenseExpired(): boolean {
    return this.props.licensePlateExpiry ? this.props.licensePlateExpiry < new Date() : false;
  }

  /**
   * Verifica se seguro está vencido
   */
  get isInsuranceExpired(): boolean {
    return this.props.insuranceExpiry ? this.props.insuranceExpiry < new Date() : false;
  }

  /**
   * Verifica se veículo pode ser alocado
   */
  get canBeAllocated(): boolean {
    return this.props.status.canBeAllocated && !this.isLicenseExpired && !this.isInsuranceExpired;
  }

  /**
   * Factory method: create() COM validações
   */
  static create(props: CreateVehicleProps): Result<Vehicle, string> {
    // Validações
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('organizationId é obrigatório e deve ser maior que 0');
    }
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('branchId é obrigatório e deve ser maior que 0');
    }
    if (!props.plate?.trim()) {
      return Result.fail('Placa é obrigatória');
    }
    if (!props.type?.trim()) {
      return Result.fail('Tipo de veículo é obrigatório');
    }
    if (!props.createdBy?.trim()) {
      return Result.fail('createdBy é obrigatório');
    }

    // Validar tipo de veículo
    const validTypes = ['TRUCK', 'TRAILER', 'VAN', 'MOTORCYCLE', 'CAR'];
    if (!validTypes.includes(props.type.toUpperCase())) {
      return Result.fail(`Tipo de veículo inválido: ${props.type}`);
    }

    // Normalizar placa (remover hífen)
    const normalizedPlate = props.plate.toUpperCase().replace(/-/g, '');

    const now = new Date();
    const id = 0; // ID será gerado pelo banco

    const vehicle = new Vehicle(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      plate: normalizedPlate,
      renavam: props.renavam?.trim() ?? null,
      chassis: props.chassis?.trim() ?? null,
      type: props.type.toUpperCase(),
      brand: props.brand?.trim() ?? null,
      model: props.model?.trim() ?? null,
      year: props.year ?? null,
      color: props.color?.trim() ?? null,
      capacityKg: props.capacityKg ?? 0,
      capacityM3: props.capacityM3 ?? 0,
      taraKg: props.taraKg ?? 0,
      status: VehicleStatus.available(),
      currentKm: props.currentKm ?? 0,
      maintenanceStatus: 'OK',
      lastMaintenanceDate: null,
      nextMaintenanceKm: null,
      licensePlateExpiry: props.licensePlateExpiry ?? null,
      insuranceExpiry: props.insuranceExpiry ?? null,
      notes: props.notes?.trim() ?? null,
      createdBy: props.createdBy.trim(),
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    }, now);

    return Result.ok(vehicle);
  }

  /**
   * Factory method: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: VehicleProps & { id: number }): Result<Vehicle, string> {
    return Result.ok(new Vehicle(props.id, props, props.createdAt));
  }

  /**
   * Atualiza odômetro
   */
  updateKm(km: number, updatedBy: string): Result<void, string> {
    if (km < this.props.currentKm) {
      return Result.fail('Km não pode ser menor que o atual');
    }

    (this.props as { currentKm: number }).currentKm = km;
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;

    // Verificar se precisa de manutenção
    if (this.props.nextMaintenanceKm && km >= this.props.nextMaintenanceKm) {
      (this.props as { maintenanceStatus: string }).maintenanceStatus = 'WARNING';
    }

    this.touch();
    return Result.ok(undefined);
  }

  /**
   * Coloca em manutenção
   */
  setMaintenance(updatedBy: string): Result<void, string> {
    (this.props as { status: VehicleStatus }).status = VehicleStatus.maintenance();
    (this.props as { maintenanceStatus: string }).maintenanceStatus = 'CRITICAL';
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Libera da manutenção
   */
  releaseFromMaintenance(nextMaintenanceKm: number, updatedBy: string): Result<void, string> {
    (this.props as { status: VehicleStatus }).status = VehicleStatus.available();
    (this.props as { maintenanceStatus: string }).maintenanceStatus = 'OK';
    (this.props as { lastMaintenanceDate: Date | null }).lastMaintenanceDate = new Date();
    (this.props as { nextMaintenanceKm: number | null }).nextMaintenanceKm = nextMaintenanceKm;
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Marca como em trânsito
   */
  setInTransit(updatedBy: string): Result<void, string> {
    if (!this.props.status.isAvailable) {
      return Result.fail('Veículo precisa estar disponível para iniciar trânsito');
    }

    (this.props as { status: VehicleStatus }).status = VehicleStatus.inTransit();
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Libera do trânsito
   */
  releaseFromTransit(updatedBy: string): Result<void, string> {
    if (!this.props.status.isInTransit) {
      return Result.fail('Veículo precisa estar em trânsito');
    }

    (this.props as { status: VehicleStatus }).status = VehicleStatus.available();
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Inativa o veículo
   */
  inactivate(updatedBy: string): Result<void, string> {
    (this.props as { status: VehicleStatus }).status = VehicleStatus.inactive();
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }
}
