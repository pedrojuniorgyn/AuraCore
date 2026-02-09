/**
 * IInsuranceValidatorService - Output Port
 *
 * Interface para validacao de averbacao de seguro.
 * Obrigatorio por Lei 11.442/07 para transporte de carga.
 *
 * @see ARCH-011: Repositories/Services implementam interface de domain/ports/output/
 * @see ARCH-006: Dependencias apontam para Domain (inward)
 */
import { Result } from '@/shared/domain';

export interface IInsuranceValidatorService {
  /**
   * Valida se a ordem de coleta tem averbacao de seguro valida
   * @param pickupOrderId ID da ordem de coleta
   * @returns Result indicando se o seguro e valido
   */
  validatePickupOrderInsurance(pickupOrderId: number): Promise<Result<void, string>>;
}
