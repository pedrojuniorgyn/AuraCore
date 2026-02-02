/**
 * Entity: Department
 * Departamento organizacional com suporte a multi-tenancy
 *
 * @module shared/domain/entities
 */
import { Entity, Result } from '@/shared/domain';

export interface DepartmentProps {
  organizationId: number;
  branchId: number;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  managerUserId: number | null;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
}

interface CreateDepartmentProps {
  organizationId: number;
  branchId: number;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  managerUserId?: number;
  createdBy?: string;
}

export class Department extends Entity<string> {
  private readonly props: DepartmentProps;

  private constructor(id: string, props: DepartmentProps, createdAt?: Date) {
    super(id, createdAt);
    this.props = props;
  }

  // Getters
  get organizationId(): number { return this.props.organizationId; }
  get branchId(): number { return this.props.branchId; }
  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get parentId(): string | null { return this.props.parentId; }
  get managerUserId(): number | null { return this.props.managerUserId; }
  get isActive(): boolean { return this.props.isActive; }
  get createdBy(): string | null { return this.props.createdBy; }
  get updatedBy(): string | null { return this.props.updatedBy; }

  /**
   * Factory: create() COM validações
   */
  static create(props: CreateDepartmentProps): Result<Department, string> {
    // Validações
    if (!props.organizationId) return Result.fail('organizationId é obrigatório');
    if (!props.branchId) return Result.fail('branchId é obrigatório');
    if (!props.code?.trim()) return Result.fail('code é obrigatório');
    if (props.code.trim().length > 20) {
      return Result.fail('code deve ter no máximo 20 caracteres');
    }
    if (!props.name?.trim()) return Result.fail('name é obrigatório');
    if (props.name.trim().length > 100) {
      return Result.fail('name deve ter no máximo 100 caracteres');
    }
    if (props.description && props.description.length > 500) {
      return Result.fail('description deve ter no máximo 500 caracteres');
    }

    const id = globalThis.crypto.randomUUID();
    const now = new Date();

    const department = new Department(id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      code: props.code.trim().toUpperCase(),
      name: props.name.trim(),
      description: props.description?.trim() || null,
      parentId: props.parentId || null,
      managerUserId: props.managerUserId || null,
      isActive: true,
      createdBy: props.createdBy || null,
      updatedBy: null,
    }, now);

    return Result.ok(department);
  }

  /**
   * Factory: reconstitute() SEM validações (para Mapper)
   */
  static reconstitute(props: DepartmentProps & { id: string; createdAt: Date }): Result<Department, string> {
    return Result.ok(new Department(props.id, {
      organizationId: props.organizationId,
      branchId: props.branchId,
      code: props.code,
      name: props.name,
      description: props.description,
      parentId: props.parentId,
      managerUserId: props.managerUserId,
      isActive: props.isActive,
      createdBy: props.createdBy,
      updatedBy: props.updatedBy,
    }, props.createdAt));
  }

  // Métodos de negócio

  /**
   * Atualiza informações do department
   */
  updateDetails(props: {
    name?: string;
    description?: string;
    parentId?: string;
    managerUserId?: number;
  }, updatedBy?: string): Result<void, string> {
    if (props.name !== undefined) {
      if (!props.name.trim()) {
        return Result.fail('name não pode ser vazio');
      }
      if (props.name.length > 100) {
        return Result.fail('name deve ter no máximo 100 caracteres');
      }
      (this.props as { name: string }).name = props.name.trim();
    }

    if (props.description !== undefined) {
      if (props.description && props.description.length > 500) {
        return Result.fail('description deve ter no máximo 500 caracteres');
      }
      (this.props as { description: string | null }).description = props.description?.trim() || null;
    }

    if (props.parentId !== undefined) {
      (this.props as { parentId: string | null }).parentId = props.parentId || null;
    }

    if (props.managerUserId !== undefined) {
      (this.props as { managerUserId: number | null }).managerUserId = props.managerUserId || null;
    }

    (this.props as { updatedBy: string | null }).updatedBy = updatedBy || null;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Desativa o department
   */
  deactivate(updatedBy?: string): Result<void, string> {
    if (!this.props.isActive) {
      return Result.fail('Department já está inativo');
    }

    (this.props as { isActive: boolean }).isActive = false;
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy || null;
    this.touch();

    return Result.ok(undefined);
  }

  /**
   * Ativa o department
   */
  activate(updatedBy?: string): Result<void, string> {
    if (this.props.isActive) {
      return Result.fail('Department já está ativo');
    }

    (this.props as { isActive: boolean }).isActive = true;
    (this.props as { updatedBy: string | null }).updatedBy = updatedBy || null;
    this.touch();

    return Result.ok(undefined);
  }
}
