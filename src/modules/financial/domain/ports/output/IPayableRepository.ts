import { AccountPayable } from '../../entities/AccountPayable';

export interface FindPayablesFilter {
  organizationId: number;
  branchId?: number;
  supplierId?: number;
  status?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Port (interface) para repositório de Contas a Pagar
 * 
 * Esta interface define O QUE o repositório deve fazer,
 * não COMO (isso é responsabilidade do adapter/infrastructure)
 */
export interface IPayableRepository {
  /**
   * Busca por ID
   */
  findById(id: string, organizationId: number): Promise<AccountPayable | null>;

  /**
   * Busca com filtros e paginação
   */
  findMany(
    filter: FindPayablesFilter,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<AccountPayable>>;

  /**
   * Salva (create ou update)
   */
  save(payable: AccountPayable): Promise<void>;

  /**
   * Busca vencidos
   */
  findOverdue(
    organizationId: number,
    branchId?: number,
    referenceDate?: Date
  ): Promise<AccountPayable[]>;

  /**
   * Busca por fornecedor
   */
  findBySupplier(
    supplierId: number,
    organizationId: number
  ): Promise<AccountPayable[]>;

  /**
   * Verifica existência
   */
  exists(id: string, organizationId: number): Promise<boolean>;

  /**
   * Gera próximo número de documento (se aplicável)
   */
  nextDocumentNumber(organizationId: number, branchId: number): Promise<string>;
}

