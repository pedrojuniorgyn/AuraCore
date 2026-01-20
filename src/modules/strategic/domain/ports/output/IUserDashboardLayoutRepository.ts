/**
 * Port Output: IUserDashboardLayoutRepository
 * Interface do repositório de layouts de dashboard por usuário
 * 
 * @module strategic/domain/ports/output
 */

export interface DashboardLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface IUserDashboardLayoutRepository {
  /**
   * Busca layout por usuário
   */
  findByUserId(
    userId: string,
    organizationId: number,
    branchId: number
  ): Promise<DashboardLayoutItem[] | null>;

  /**
   * Salva ou atualiza layout do usuário
   */
  save(
    userId: string,
    organizationId: number,
    branchId: number,
    layout: DashboardLayoutItem[]
  ): Promise<void>;

  /**
   * Remove layout do usuário
   */
  delete(
    userId: string,
    organizationId: number,
    branchId: number
  ): Promise<void>;
}
