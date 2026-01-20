/**
 * ICreateCteUseCase - Input Port
 *
 * Interface do caso de uso para criação de CTe.
 * Define contrato entre Application e Domain layers.
 *
 * @module fiscal/domain/ports/input
 * @see ARCH-010: Use Cases implementam Input Ports
 * @see E8 Fase 3: Use Cases Orquestradores
 */

import { Result } from '@/shared/domain';

// ============================================================================
// INPUT
// ============================================================================

export interface CreateCteInput {
  /** ID da ordem de coleta */
  pickupOrderId: number;
  /** ID da organização (multi-tenant) */
  organizationId: number;
  /** ID da filial (multi-tenant) */
  branchId: number;
  /** ID do usuário criando o CTe */
  userId: string;
}

// ============================================================================
// OUTPUT
// ============================================================================

export interface CreateCteOutput {
  /** ID do CTe criado */
  cteId: number;
  /** Número do CTe */
  cteNumber: string;
  /** Série do CTe */
  cteSeries: string;
  /** Status inicial */
  status: string;
  /** Data de criação */
  createdAt: Date;
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Use Case para criação de CTe.
 *
 * Orquestra:
 * - Validação de ordem de coleta
 * - Validação de seguro (averbação)
 * - CteBuilderService (gerar estrutura)
 * - ICteRepository (persistir)
 */
export interface ICreateCteUseCase {
  execute(input: CreateCteInput): Promise<Result<CreateCteOutput, string>>;
}
