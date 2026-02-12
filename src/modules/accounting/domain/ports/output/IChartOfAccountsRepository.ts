/**
 * IChartOfAccountsRepository - Output Port (ARCH-011)
 * 
 * Port para acesso ao plano de contas contábil.
 * Usado pelo AccountIntegrityService para validações de integridade (F1.8).
 */

export interface ChartAccountInfo {
  id: number;
  organizationId: number;
  code: string;
  name: string;
  type: string;
  category: string;
  parentId: number | null;
  level: number;
  isAnalytical: boolean;
  status: string;
}

export interface IChartOfAccountsRepository {
  /** Busca conta pelo ID */
  findById(id: number, organizationId: number): Promise<ChartAccountInfo | null>;

  /** Busca conta pelo código */
  findByCode(code: string, organizationId: number): Promise<ChartAccountInfo | null>;

  /** Verifica se conta tem lançamentos vinculados (qualquer status) */
  countLinkedEntries(accountId: number, organizationId: number): Promise<number>;

  /** Verifica se conta tem lançamentos POSTED */
  hasPostedEntries(accountId: number, organizationId: number): Promise<boolean>;

  /** Busca múltiplas contas por ID */
  findByIds(ids: number[], organizationId: number): Promise<ChartAccountInfo[]>;

  /** Busca múltiplas contas por código */
  findByCodes(codes: string[], organizationId: number): Promise<ChartAccountInfo[]>;

  /** Soft-delete (desativar) conta */
  deactivate(id: number, organizationId: number): Promise<void>;
}
