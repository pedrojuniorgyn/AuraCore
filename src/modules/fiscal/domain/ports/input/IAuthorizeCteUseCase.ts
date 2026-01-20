/**
 * IAuthorizeCteUseCase - Input Port
 *
 * Interface do caso de uso para autorização de CTe na SEFAZ.
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

export interface AuthorizeCteInput {
  /** ID do CTe no banco */
  cteId: number;
  /** ID da organização (multi-tenant) */
  organizationId: number;
  /** ID da filial (multi-tenant) */
  branchId: number;
  /** ID do usuário executando a ação */
  userId: string;
}

// ============================================================================
// OUTPUT
// ============================================================================

export interface AuthorizeCteOutput {
  /** ID do CTe */
  cteId: number;
  /** Chave de acesso (44 dígitos) */
  cteKey: string;
  /** Número do protocolo de autorização */
  protocolNumber: string;
  /** Data/hora da autorização */
  authorizationDate: Date;
}

// ============================================================================
// INTERFACE
// ============================================================================

/**
 * Use Case para autorização de CTe na SEFAZ.
 *
 * Orquestra:
 * - ICteRepository (buscar CTe)
 * - CteBuilderService (gerar XML)
 * - XmlSignerService (assinar)
 * - ISefazGateway (transmitir)
 */
export interface IAuthorizeCteUseCase {
  execute(input: AuthorizeCteInput): Promise<Result<AuthorizeCteOutput, string>>;
}
