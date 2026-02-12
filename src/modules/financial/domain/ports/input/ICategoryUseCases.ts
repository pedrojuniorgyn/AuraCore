/**
 * 💰 CATEGORIES - INPUT PORTS (ARCH-010)
 * F2.4: Migração para DDD
 */
import type { Result } from '@/shared/domain';

export interface CategoryOutput {
  id: number;
  organizationId: number;
  name: string;
  code: string | null;
  type: string;
  description: string | null;
  status: string;
}

export interface ListCategoriesInput {
  type?: string; // 'INCOME' | 'EXPENSE'
}

export interface CreateCategoryInput {
  name: string;
  code?: string;
  type: string;
  description?: string;
}

export interface UpdateCategoryInput {
  id: number;
  name?: string;
  code?: string;
  type?: string;
  description?: string;
  status?: string;
}

export type ExecutionContext = {
  organizationId: number;
  branchId: number;
  userId: string;
};

export interface IListCategories {
  execute(input: ListCategoriesInput, ctx: ExecutionContext): Promise<Result<CategoryOutput[], string>>;
}

export interface ICreateCategory {
  execute(input: CreateCategoryInput, ctx: ExecutionContext): Promise<Result<CategoryOutput, string>>;
}

export interface IUpdateCategory {
  execute(input: UpdateCategoryInput, ctx: ExecutionContext): Promise<Result<CategoryOutput, string>>;
}

export interface IDeleteCategory {
  execute(id: number, ctx: ExecutionContext): Promise<Result<void, string>>;
}
