/**
 * ListReceivables DTO - Schema Zod para validação
 */
import { z } from 'zod';

export const ListReceivablesInputSchema = z.object({
  status: z.enum(['OPEN', 'PROCESSING', 'PARTIAL', 'RECEIVED', 'CANCELLED', 'OVERDUE']).optional(),
  customerId: z.number().int().positive().optional(),
  dueDateFrom: z.coerce.date().optional(),
  dueDateTo: z.coerce.date().optional(),
  overdueOnly: z.boolean().optional().default(false),
  page: z.number().int().positive().optional().default(1),
  pageSize: z.number().int().min(1).max(100).optional().default(20),
});

export type ListReceivablesInput = z.infer<typeof ListReceivablesInputSchema>;
