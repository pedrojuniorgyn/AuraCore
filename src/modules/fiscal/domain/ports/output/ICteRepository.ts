// CTe Repository Interface
export interface CteFilter {
  organizationId: number;
  branchId?: number;
  status?: string;
  cteKey?: string;
  page?: number;
  pageSize?: number;
}

export interface ICteRepository {
  findById(id: number, organizationId: number): Promise<unknown>;
  findByCteKey(cteKey: string, organizationId: number): Promise<unknown>;
  findByNumber(cteNumber: number, serie: string, organizationId: number): Promise<unknown>;
  findMany(filter: CteFilter): Promise<{ items: unknown[]; total: number }>;
  save(cte: unknown): Promise<void>;
  update(id: number, cte: unknown): Promise<void>;
  delete(id: number, organizationId: number): Promise<void>;
}
