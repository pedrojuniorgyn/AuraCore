/**
 * DTO: CreateStrategicGoal (Objetivo Estratégico)
 * 
 * Schema Zod para validação de criação de objetivo estratégico BSC.
 * 
 * @module strategic/application/dtos
 * @see ADR-0021 - BSC Implementation
 */

import { z } from 'zod';

/**
 * Níveis de cascateamento válidos
 */
export const CascadeLevelEnum = z.enum(['CEO', 'DIRECTOR', 'MANAGER', 'TEAM']);
export type CascadeLevelType = z.infer<typeof CascadeLevelEnum>;

/**
 * Polaridade do objetivo (UP = maior é melhor, DOWN = menor é melhor)
 */
export const PolarityEnum = z.enum(['UP', 'DOWN']);
export type PolarityType = z.infer<typeof PolarityEnum>;

/**
 * Schema de validação para criação de objetivo estratégico
 */
export const CreateStrategicGoalInputSchema = z.object({
  /**
   * ID da perspectiva BSC (Financeira, Cliente, Processos, Aprendizado)
   */
  perspectiveId: z.string().uuid('perspectiveId deve ser um UUID válido'),

  /**
   * ID do objetivo pai para cascateamento (opcional para nível CEO)
   */
  parentGoalId: z.string().uuid('parentGoalId deve ser um UUID válido').optional(),

  /**
   * Código único do objetivo (ex: OBJ-FIN-001)
   */
  code: z.string()
    .min(3, 'code deve ter no mínimo 3 caracteres')
    .max(20, 'code deve ter no máximo 20 caracteres')
    .regex(/^[A-Z0-9\-_]+$/, 'code deve conter apenas letras maiúsculas, números, - e _'),

  /**
   * Descrição do objetivo
   */
  description: z.string()
    .min(10, 'description deve ter no mínimo 10 caracteres')
    .max(500, 'description deve ter no máximo 500 caracteres'),

  /**
   * Nível de cascateamento
   */
  cascadeLevel: CascadeLevelEnum,

  /**
   * Valor meta a ser atingido
   */
  targetValue: z.number()
    .min(0, 'targetValue não pode ser negativo'),

  /**
   * Valor de referência inicial (baseline)
   */
  baselineValue: z.number().optional(),

  /**
   * Unidade de medida (ex: %, R$, unidades)
   */
  unit: z.string()
    .min(1, 'unit é obrigatório')
    .max(20, 'unit deve ter no máximo 20 caracteres'),

  /**
   * Polaridade: UP (maior é melhor) ou DOWN (menor é melhor)
   */
  polarity: PolarityEnum.default('UP'),

  /**
   * Peso do objetivo (0-100%)
   */
  weight: z.number()
    .min(0, 'weight deve ser no mínimo 0')
    .max(100, 'weight deve ser no máximo 100'),

  /**
   * ID do usuário responsável
   */
  ownerUserId: z.string().uuid('ownerUserId deve ser um UUID válido'),

  /**
   * ID da filial do responsável
   */
  ownerBranchId: z.number()
    .int('ownerBranchId deve ser um inteiro')
    .positive('ownerBranchId deve ser positivo'),

  /**
   * Data de início do período
   */
  startDate: z.string()
    .datetime('startDate deve ser uma data ISO válida')
    .transform((val) => new Date(val)),

  /**
   * Data limite para atingir a meta
   */
  dueDate: z.string()
    .datetime('dueDate deve ser uma data ISO válida')
    .transform((val) => new Date(val)),
}).refine(
  (data) => {
    const start = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
    const due = data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate);
    return due > start;
  },
  {
    message: 'dueDate deve ser posterior a startDate',
    path: ['dueDate'],
  }
).refine(
  (data) => {
    // Se não tem parent, deve ser nível CEO
    if (!data.parentGoalId && data.cascadeLevel !== 'CEO') {
      return false;
    }
    return true;
  },
  {
    message: 'Objetivos sem pai (raiz) devem ser do nível CEO',
    path: ['cascadeLevel'],
  }
);

export type CreateStrategicGoalInput = z.infer<typeof CreateStrategicGoalInputSchema>;

/**
 * Schema de output após criação
 */
export const CreateStrategicGoalOutputSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  description: z.string(),
  cascadeLevel: CascadeLevelEnum,
});

export type CreateStrategicGoalOutput = z.infer<typeof CreateStrategicGoalOutputSchema>;
