import { z } from 'zod';

/**
 * Generic List Query DTO with Pagination - E7.8 WMS Semana 3
 * 
 * Padrão para listagem paginada em todos os use cases de consulta
 */

export const ListQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export type ListQueryInput = z.infer<typeof ListQuerySchema>;

export interface PaginatedResponse<T, E = never> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

