// MDF-e Repository Interface
export interface MdfeFilter {
  organizationId: number;
  branchId?: number;
  status?: string;
  mdfeKey?: string;
  page?: number;
  pageSize?: number;
}

export interface IMdfeRepository {
  findById(id: number, organizationId: number): Promise<unknown>;
  findByMdfeKey(mdfeKey: string, organizationId: number): Promise<unknown>;
  findMany(filter: MdfeFilter): Promise<{ items: unknown[]; total: number }>;
  save(mdfe: unknown): Promise<void>;
  update(id: number, mdfe: unknown): Promise<void>;
  delete(id: number, organizationId: number): Promise<void>;
}
