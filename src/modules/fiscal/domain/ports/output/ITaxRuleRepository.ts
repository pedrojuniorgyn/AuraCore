// Tax Rules Repository Interface
export interface TaxRuleFilter {
  organizationId: number;
  originState?: string;
  destinationState?: string;
  page?: number;
  pageSize?: number;
}

export interface ITaxRuleRepository {
  findById(id: number, organizationId: number): Promise<unknown>;
  findByRoute(originState: string, destinationState: string, organizationId: number): Promise<unknown>;
  findMany(filter: TaxRuleFilter): Promise<{ items: unknown[]; total: number }>;
  save(taxRule: unknown): Promise<void>;
  update(id: number, taxRule: unknown): Promise<void>;
  delete(id: number, organizationId: number): Promise<void>;
}
