import { Result } from '@/shared/domain';

/**
 * Value Object: Status do Romaneio
 * 
 * Representa os estados possíveis de um Romaneio de Carga:
 * - DRAFT: Rascunho, editável
 * - EMITTED: Emitido, acompanha carga em trânsito
 * - DELIVERED: Entregue e conferido no destino
 * - CANCELLED: Cancelado
 * 
 * Transições permitidas:
 * - DRAFT → EMITTED (emit)
 * - DRAFT → CANCELLED (cancel)
 * - EMITTED → DELIVERED (registerConference)
 * - EMITTED → CANCELLED (cancel - cancelamento em trânsito)
 */
export type RomaneioStatus = 
  | 'DRAFT'
  | 'EMITTED'
  | 'DELIVERED'
  | 'CANCELLED';

/**
 * Lista de todos os status válidos
 */
export const ROMANEIO_STATUSES: readonly RomaneioStatus[] = [
  'DRAFT',
  'EMITTED',
  'DELIVERED',
  'CANCELLED',
] as const;

/**
 * Transições de status permitidas
 */
export const ALLOWED_ROMANEIO_TRANSITIONS: Record<RomaneioStatus, RomaneioStatus[]> = {
  DRAFT: ['EMITTED', 'CANCELLED'],
  EMITTED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Estado final
  CANCELLED: [], // Estado final
};

/**
 * Verifica se um valor é um status válido
 */
export function isValidRomaneioStatus(status: string): status is RomaneioStatus {
  return ROMANEIO_STATUSES.includes(status as RomaneioStatus);
}

/**
 * Verifica se transição de status é permitida
 */
export function canTransitionToStatus(
  from: RomaneioStatus,
  to: RomaneioStatus
): boolean {
  return ALLOWED_ROMANEIO_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Cria um Value Object de status
 */
export function createRomaneioStatus(status: string): Result<RomaneioStatus, string> {
  if (!isValidRomaneioStatus(status)) {
    return Result.fail(
      `Invalid romaneio status: ${status}. Must be one of: ${ROMANEIO_STATUSES.join(', ')}`
    );
  }
  
  return Result.ok(status);
}

