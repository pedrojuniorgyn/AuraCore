// Category Repository Interface
export interface CategoryFilter {
  organizationId: number;
  type?: 'INCOME' | 'EXPENSE';
  status?: 'ACTIVE' | 'INACTIVE';
  page?: number;
  pageSize?: number;
}

export interface ICategoryRepository {
  findById(id: number, organizationId: number): Promise<unknown>;
  findByCode(code: string, organizationId: number): Promise<unknown>;
  findMany(filter: CategoryFilter): Promise<{ items: unknown[]; total: number }>;
  save(category: unknown): Promise<void>;
  update(id: number, category: unknown): Promise<void>;
  delete(id: number, organizationId: number): Promise<void>;
}
