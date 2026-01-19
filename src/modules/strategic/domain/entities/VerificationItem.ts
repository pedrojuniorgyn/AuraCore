/**
 * Entity: VerificationItem (Item de Verificação)
 * Mede as CAUSAS que afetam o Item de Controle (Metodologia GEROT/Falconi)
 * 
 * @module strategic/domain/entities
 */
import { Entity, Result } from '@/shared/domain';

export type VerificationItemStatus = 'ACTIVE' | 'INACTIVE';
export type VerificationFrequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

interface VerificationItemProps {
  organizationId: number;
  branchId: number;
  controlItemId: string;
  code: string;
  name: string;
  description: string | null;
  verificationMethod: string;
  responsibleUserId: string;
  frequency: VerificationFrequency;
  standardValue: string;
  currentValue: string | null;
  lastVerifiedAt: Date | null;
  lastVerifiedBy: string | null;
  status: VerificationItemStatus;
  correlationWeight: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateVerificationItemProps {
  organizationId: number;
  branchId: number;
  controlItemId: string;
  code: string;
  name: string;
  description?: string;
  verificationMethod: string;
  responsibleUserId: string;
  frequency: VerificationFrequency;
  standardValue: string;
  correlationWeight?: number;
}

export class VerificationItem extends Entity<string> {
  private constructor(id: string, private readonly props: VerificationItemProps) {
    super(id);
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get controlItemId(): string { return this.props.controlItemId; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get verificationMethod(): string { return this.props.verificationMethod; }
  get responsibleUserId(): string { return this.props.responsibleUserId; }
  get frequency(): VerificationFrequency { return this.props.frequency; }
  get standardValue(): string { return this.props.standardValue; }
  get currentValue(): string | null { return this.props.currentValue; }
  get lastVerifiedAt(): Date | null { return this.props.lastVerifiedAt; }
  get lastVerifiedBy(): string | null { return this.props.lastVerifiedBy; }
  get correlationWeight(): number { return this.props.correlationWeight; }
  get status(): VerificationItemStatus { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  /**
   * Verifica se está em conformidade com o padrão
   */
  isCompliant(): boolean {
    if (!this.props.currentValue) return false;
    return this.props.currentValue === this.props.standardValue;
  }

  /**
   * Verifica se a verificação está em atraso
   */
  isOverdue(): boolean {
    if (!this.props.lastVerifiedAt) return true;
    
    const now = new Date();
    const lastVerified = new Date(this.props.lastVerifiedAt);
    const daysSinceLastVerification = Math.floor(
      (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
    );

    const frequencyDays: Record<VerificationFrequency, number> = {
      DAILY: 1,
      WEEKLY: 7,
      BIWEEKLY: 14,
      MONTHLY: 30,
    };

    const maxDays = frequencyDays[this.props.frequency];
    return daysSinceLastVerification > maxDays;
  }

  /**
   * Calcula dias desde última verificação
   */
  daysSinceLastVerification(): number | null {
    if (!this.props.lastVerifiedAt) return null;
    const now = new Date();
    const lastVerified = new Date(this.props.lastVerifiedAt);
    return Math.floor(
      (now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateVerificationItemProps): Result<VerificationItem, string> {
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.code?.trim()) return Result.fail('Código é obrigatório');
    if (!props.name?.trim()) return Result.fail('Nome é obrigatório');
    if (!props.controlItemId) return Result.fail('Item de Controle é obrigatório');
    if (!props.verificationMethod?.trim()) return Result.fail('Método de verificação é obrigatório');
    if (!props.responsibleUserId) return Result.fail('Responsável é obrigatório');
    if (!props.standardValue?.trim()) return Result.fail('Valor padrão é obrigatório');

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    return Result.ok(new VerificationItem(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      controlItemId: props.controlItemId,
      code: props.code.trim().toUpperCase(),
      name: props.name.trim(),
      description: props.description?.trim() ?? null,
      verificationMethod: props.verificationMethod.trim(),
      responsibleUserId: props.responsibleUserId,
      frequency: props.frequency,
      standardValue: props.standardValue.trim(),
      currentValue: null,
      lastVerifiedAt: null,
      lastVerifiedBy: null,
      status: 'ACTIVE',
      correlationWeight: props.correlationWeight ?? 50,
      createdAt: now,
      updatedAt: now,
    }));
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: VerificationItemProps & { id: string }): Result<VerificationItem, string> {
    return Result.ok(new VerificationItem(props.id, props));
  }

  // Métodos de negócio

  /**
   * Registra uma verificação
   */
  recordVerification(value: string, verifiedBy: string): Result<{ isCompliant: boolean }, string> {
    if (!value?.trim()) return Result.fail('Valor é obrigatório');
    if (!verifiedBy) return Result.fail('verifiedBy é obrigatório');

    (this.props as { currentValue: string | null }).currentValue = value.trim();
    (this.props as { lastVerifiedAt: Date | null }).lastVerifiedAt = new Date();
    (this.props as { lastVerifiedBy: string | null }).lastVerifiedBy = verifiedBy;
    (this.props as { updatedAt: Date }).updatedAt = new Date();

    return Result.ok({ isCompliant: this.isCompliant() });
  }

  /**
   * Atualiza o valor padrão
   */
  updateStandardValue(newStandardValue: string): Result<void, string> {
    if (!newStandardValue?.trim()) return Result.fail('Valor padrão é obrigatório');
    
    (this.props as { standardValue: string }).standardValue = newStandardValue.trim();
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    
    return Result.ok(undefined);
  }

  /**
   * Desativa o item de verificação
   */
  deactivate(): Result<void, string> {
    if (this.props.status === 'INACTIVE') {
      return Result.fail('Item de verificação já está inativo');
    }
    (this.props as { status: VerificationItemStatus }).status = 'INACTIVE';
    (this.props as { updatedAt: Date }).updatedAt = new Date();
    return Result.ok(undefined);
  }
}
