/**
 * InsuranceValidatorAdapter - Infrastructure Adapter
 *
 * Adapta o servico legacy de validacao de seguro
 * para a interface do Domain Port IInsuranceValidatorService.
 *
 * @see ARCH-011: Implementa interface de domain/ports/output/
 * @see IInsuranceValidatorService
 * @see Lei 11.442/07 - Averbacao de seguro obrigatoria
 */
import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IInsuranceValidatorService } from '../../domain/ports/output/IInsuranceValidatorService';
import { validatePickupOrderInsurance } from '@/services/validators/insurance-validator';

@injectable()
export class InsuranceValidatorAdapter implements IInsuranceValidatorService {
  async validatePickupOrderInsurance(pickupOrderId: number): Promise<Result<void, string>> {
    try {
      await validatePickupOrderInsurance(pickupOrderId);
      return Result.ok(undefined);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Validacao de seguro falhou: ${message}`);
    }
  }
}
