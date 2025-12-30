import { Result } from '@/shared/domain';
import { ExpenseReport } from '../../entities/expense/ExpenseReport';
import { ExpenseReportStatus } from '../../value-objects/expense/ExpenseReportStatus';

/**
 * Filtros para busca de relatórios de despesas
 * 
 * IMPORTANTE (ENFORCE-003, ENFORCE-004):
 * - branchId é OBRIGATÓRIO (nunca opcional)
 * - Todos os métodos DEVEM filtrar por organizationId + branchId
 */
export interface FindExpenseReportsFilters {
  organizationId: number;
  branchId: number; // OBRIGATÓRIO (ENFORCE-004)
  
  status?: ExpenseReportStatus;
  employeeId?: string;
  costCenterId?: string;
  periodoInicio?: Date;
  periodoFim?: Date;
  
  // Paginação
  limit?: number;
  offset?: number;
}

/**
 * Port (Interface): Repositório de Relatórios de Despesas
 * 
 * Define o contrato para persistência de ExpenseReport.
 * 
 * REGRAS CRÍTICAS (infrastructure-layer.json):
 * - TODOS os métodos DEVEM filtrar por organizationId + branchId (INFRA-004)
 * - branchId NUNCA é opcional (ENFORCE-004)
 * - Soft delete com deletedAt (filtrar IS NULL)
 * - UPDATE persiste TODOS os campos mutáveis (INFRA-005)
 */
export interface IExpenseReportRepository {
  /**
   * Busca relatório por ID
   * 
   * @param id ID do relatório
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @returns Relatório ou null se não encontrado
   */
  findById(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<ExpenseReport | null, string>>;

  /**
   * Busca relatórios com filtros
   * 
   * @param filters Filtros de busca (branchId obrigatório)
   * @returns Lista de relatórios
   */
  findMany(filters: FindExpenseReportsFilters): Promise<Result<ExpenseReport[], string>>;

  /**
   * Busca relatórios de um colaborador
   * 
   * @param employeeId ID do colaborador
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @returns Lista de relatórios
   */
  findByEmployee(
    employeeId: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<ExpenseReport[], string>>;

  /**
   * Busca relatórios pendentes de aprovação
   * 
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @returns Lista de relatórios
   */
  findPendingApproval(
    organizationId: number,
    branchId: number
  ): Promise<Result<ExpenseReport[], string>>;

  /**
   * Salva relatório (INSERT ou UPDATE)
   * 
   * INSERT: Persiste TODOS os campos
   * UPDATE: Atualiza TODOS os campos mutáveis (INFRA-005)
   * 
   * @param report Relatório a salvar
   * @returns Relatório salvo
   */
  save(report: ExpenseReport): Promise<Result<ExpenseReport, string>>;

  /**
   * Deleta relatório (soft delete)
   * 
   * @param id ID do relatório
   * @param organizationId ID da organização
   * @param branchId ID da filial (OBRIGATÓRIO)
   * @returns void
   */
  delete(
    id: string,
    organizationId: number,
    branchId: number
  ): Promise<Result<void, string>>;

  /**
   * Conta relatórios com filtros
   * 
   * @param filters Filtros de busca (branchId obrigatório)
   * @returns Total de relatórios
   */
  count(filters: FindExpenseReportsFilters): Promise<Result<number, string>>;
}

