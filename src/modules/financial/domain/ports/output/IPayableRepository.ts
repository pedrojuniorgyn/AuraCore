import { AccountPayable } from '../../entities/AccountPayable';

/**
 * Filtros para busca de contas a pagar
 * 
 * IMPORTANTE (ENFORCE-003, ENFORCE-004):
 * - branchId é OBRIGATÓRIO (nunca opcional)
 * - Todos os métodos DEVEM filtrar por organizationId + branchId
 */
export interface FindPayablesFilter {
  organizationId: number;
  branchId: number; // OBRIGATÓRIO (ENFORCE-004)
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
 * 
 * REGRAS CRÍTICAS (infrastructure-layer.json):
 * - TODOS os métodos DEVEM filtrar por organizationId + branchId (INFRA-004)
 * - branchId NUNCA é opcional (ENFORCE-004)
 * - Soft delete com deletedAt (filtrar IS NULL)
 */
export interface IPayableRepository {
  /**
   * Busca por ID
   * 
   * @param id ID da conta a pagar
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<AccountPayable | null>;

  /**
   * Busca com filtros e paginação
   * 
   * @param filter Filtros de busca (branchId obrigatório)
   * @param pagination Opções de paginação
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
   * 
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @param referenceDate Data de referência (default: hoje)
   */
  findOverdue(
    organizationId: number,
    branchId: number,
    referenceDate?: Date
  ): Promise<AccountPayable[]>;

  /**
   * Busca por fornecedor
   * 
   * @param supplierId ID do fornecedor
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   */
  findBySupplier(
    supplierId: number,
    organizationId: number,
    branchId: number
  ): Promise<AccountPayable[]>;

  /**
   * Verifica existência
   * 
   * @param id ID da conta a pagar
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   */
  exists(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<boolean>;

  /**
   * Gera próximo número de documento
   * 
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   */
  nextDocumentNumber(organizationId: number, branchId: number): Promise<string>;
}

