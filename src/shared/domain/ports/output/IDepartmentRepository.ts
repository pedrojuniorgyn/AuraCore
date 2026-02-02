/**
 * Repository Port: IDepartmentRepository
 * Interface para persistência de departments
 *
 * @module shared/domain/ports/output
 */
import { Department } from '../../entities/Department';
import { Result } from '../../types/Result';

export interface DepartmentFilter {
  organizationId: number;
  branchId: number;
  isActive?: boolean;
  parentId?: string | null;
}

export interface IDepartmentRepository {
  /**
   * Busca department por ID
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Department | null>;

  /**
   * Busca department por código
   */
  findByCode(
    code: string,
    organizationId: number,
    branchId: number
  ): Promise<Department | null>;

  /**
   * Lista departments com filtros
   */
  findAll(filter: DepartmentFilter): Promise<Department[]>;

  /**
   * Salva (insert ou update)
   */
  save(department: Department): Promise<Result<void, string>>;

  /**
   * Soft delete
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>>;

  /**
   * Cria departments padrão para nova organização
   */
  seedDefaults(
    organizationId: number,
    branchId: number,
    createdBy?: string
  ): Promise<Result<Department[], string>>;
}
