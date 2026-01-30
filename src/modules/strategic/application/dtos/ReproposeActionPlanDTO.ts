/**
 * DTO: ReproposeActionPlanDTO
 * Input para reproposição de plano de ação
 *
 * @module strategic/application/dtos
 */

export interface ReproposeActionPlanInput {
  /** ID do plano original a ser reproposto */
  originalPlanId: string;

  /** Motivo da reproposição (obrigatório) */
  reason: string;

  /** Nova data de término (obrigatória, deve ser futura) */
  newWhenEnd: Date;

  /** Novo responsável (opcional - mantém o original se não informado) */
  newWhoUserId?: string;

  /** Nome do novo responsável (se trocar) */
  newWho?: string;
}

export interface ReproposeActionPlanOutput {
  /** ID do novo plano criado */
  id: string;

  /** Código do novo plano (ex: AP-2026-001-R1) */
  code: string;

  /** Número da reproposição (1, 2 ou 3) */
  repropositionNumber: number;

  /** ID do plano original */
  originalPlanId: string;
}
