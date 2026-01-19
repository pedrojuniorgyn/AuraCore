/**
 * Driver Entity - Aggregate Root
 * 
 * Representa um motorista no sistema TMS.
 */
import { AggregateRoot, Result } from '@/shared/domain';
import { DriverStatus, type DriverStatusType } from '../value-objects/DriverStatus';

interface DriverProps {
  organizationId: number;
  branchId: number;
  
  // Dados Pessoais
  name: string;
  cpf: string;
  phone: string | null;
  email: string | null;
  
  // CNH
  cnhNumber: string;
  cnhCategory: string;
  cnhExpiry: Date;
  cnhIssueDate: Date | null;
  
  // Relacionamentos
  partnerId: number | null;
  
  // Status
  status: DriverStatus;
  
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

export interface CreateDriverProps {
  organizationId: number;
  branchId: number;
  name: string;
  cpf: string;
  phone?: string;
  email?: string;
  cnhNumber: string;
  cnhCategory: string;
  cnhExpiry: Date;
  cnhIssueDate?: Date;
  partnerId?: number;
  notes?: string;
  createdBy: string;
}

export class Driver extends AggregateRoot<number> {
  private readonly props: DriverProps;

  private constructor(id: number, props: DriverProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get name(): string { return this.props.name; }
  get cpf(): string { return this.props.cpf; }
  get phone(): string | null { return this.props.phone; }
  get email(): string | null { return this.props.email; }
  get cnhNumber(): string { return this.props.cnhNumber; }
  get cnhCategory(): string { return this.props.cnhCategory; }
  get cnhExpiry(): Date { return this.props.cnhExpiry; }
  get cnhIssueDate(): Date | null { return this.props.cnhIssueDate; }
  get partnerId(): number | null { return this.props.partnerId; }
  get status(): DriverStatus { return this.props.status; }
  get notes(): string | null { return this.props.notes; }
  get createdBy(): string { return this.props.createdBy; }
  get updatedBy(): string | null { return this.props.updatedBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get version(): number { return this.props.version; }

  /**
   * Verifica se CNH está vencida
   */
  get isCnhExpired(): boolean {
    return this.props.cnhExpiry < new Date();
  }

  /**
   * Verifica se motorista pode dirigir
   */
  get canDrive(): boolean {
    return this.props.status.canDrive && !this.isCnhExpired;
  }

  /**
   * Factory method: create() COM validações
   */
  static create(props: CreateDriverProps): Result<Driver, string> {
    // Validações
    if (!props.organizationId || props.organizationId <= 0) {
      return Result.fail('organizationId é obrigatório e deve ser maior que 0');
    }
    if (!props.branchId || props.branchId <= 0) {
      return Result.fail('branchId é obrigatório e deve ser maior que 0');
    }
    if (!props.name?.trim()) {
      return Result.fail('Nome é obrigatório');
    }
    if (!props.cpf?.trim()) {
      return Result.fail('CPF é obrigatório');
    }
    if (!props.cnhNumber?.trim()) {
      return Result.fail('Número da CNH é obrigatório');
    }
    if (!props.cnhCategory?.trim()) {
      return Result.fail('Categoria da CNH é obrigatória');
    }
    if (!props.cnhExpiry) {
      return Result.fail('Data de vencimento da CNH é obrigatória');
    }
    if (!props.createdBy?.trim()) {
      return Result.fail('createdBy é obrigatório');
    }

    // Validar categoria da CNH
    const validCategories = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];
    if (!validCategories.includes(props.cnhCategory.toUpperCase())) {
      return Result.fail(`Categoria CNH inválida: ${props.cnhCategory}`);
    }

    const now = new Date();
    const id = 0; // ID será gerado pelo banco

    const driver = new Driver(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      name: props.name.trim(),
      cpf: props.cpf.replace(/\D/g, ''),
      phone: props.phone?.trim() ?? null,
      email: props.email?.trim().toLowerCase() ?? null,
      cnhNumber: props.cnhNumber.trim(),
      cnhCategory: props.cnhCategory.toUpperCase(),
      cnhExpiry: props.cnhExpiry,
      cnhIssueDate: props.cnhIssueDate ?? null,
      partnerId: props.partnerId ?? null,
      status: DriverStatus.active(),
      notes: props.notes?.trim() ?? null,
      createdBy: props.createdBy.trim(),
      updatedBy: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      version: 1,
    }, now);

    return Result.ok(driver);
  }

  /**
   * Factory method: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: DriverProps & { id: number }): Result<Driver, string> {
    return Result.ok(new Driver(props.id, props, props.createdAt));
  }

  /**
   * Atualiza dados do motorista
   */
  update(data: {
    name?: string;
    phone?: string;
    email?: string;
    cnhCategory?: string;
    cnhExpiry?: Date;
    notes?: string;
  }, updatedBy: string): Result<void, string> {
    if (data.name !== undefined) {
      if (!data.name.trim()) {
        return Result.fail('Nome não pode ser vazio');
      }
      (this.props as { name: string }).name = data.name.trim();
    }

    if (data.phone !== undefined) {
      (this.props as { phone: string | null }).phone = data.phone.trim() || null;
    }

    if (data.email !== undefined) {
      (this.props as { email: string | null }).email = data.email.trim().toLowerCase() || null;
    }

    if (data.cnhCategory !== undefined) {
      const validCategories = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];
      if (!validCategories.includes(data.cnhCategory.toUpperCase())) {
        return Result.fail(`Categoria CNH inválida: ${data.cnhCategory}`);
      }
      (this.props as { cnhCategory: string }).cnhCategory = data.cnhCategory.toUpperCase();
    }

    if (data.cnhExpiry !== undefined) {
      (this.props as { cnhExpiry: Date }).cnhExpiry = data.cnhExpiry;
    }

    if (data.notes !== undefined) {
      (this.props as { notes: string | null }).notes = data.notes.trim() || null;
    }

    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Bloqueia o motorista
   */
  block(reason: string, updatedBy: string): Result<void, string> {
    (this.props as { status: DriverStatus }).status = DriverStatus.blocked();
    (this.props as { notes: string | null }).notes = `[BLOQUEADO] ${reason}`;
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Ativa o motorista
   */
  activate(updatedBy: string): Result<void, string> {
    (this.props as { status: DriverStatus }).status = DriverStatus.active();
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Coloca motorista em férias
   */
  setVacation(updatedBy: string): Result<void, string> {
    (this.props as { status: DriverStatus }).status = DriverStatus.vacation();
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Inativa o motorista
   */
  inactivate(updatedBy: string): Result<void, string> {
    (this.props as { status: DriverStatus }).status = DriverStatus.inactive();
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy;
    this.touch();

    return Result.ok(undefined);
  }
}
