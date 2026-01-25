import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.string().or(z.number()).transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, { message: 'ID inválido' }),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('ID inválido'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const multiTenancySchema = z.object({
  organizationId: z.number().int().positive('organizationId obrigatório'),
  branchId: z.number().int().positive('branchId obrigatório'),
});

/**
 * Schema para intervalo de datas
 * 
 * REGRA: Usar apenas .optional(), NUNCA .or() após .optional()
 * 
 * Validação:
 * - Ambos os campos são opcionais
 * - Se ambos presentes, startDate deve ser <= endDate
 */
export const dateRangeSchema = z
  .object({
    startDate: z.string().datetime({ message: 'Data inicial inválida (use formato ISO)' }).optional(),
    endDate: z.string().datetime({ message: 'Data final inválida (use formato ISO)' }).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    { 
      message: 'startDate deve ser anterior ou igual a endDate',
      path: ['startDate'],
    }
  );

/**
 * Tipo inferido do dateRangeSchema
 */
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
