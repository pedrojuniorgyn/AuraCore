/**
 * CteBuilderAdapter - Infrastructure Adapter
 *
 * Adapta o servico legacy de construcao de CTe XML
 * para a interface do Domain Port ICteBuilderService.
 *
 * @see ARCH-011: Implementa interface de domain/ports/output/
 * @see ICteBuilderService
 */
import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { ICteBuilderService, CteBuilderInput } from '../../domain/ports/output/ICteBuilderService';
import { buildCteXml } from '@/services/fiscal/cte-builder';

@injectable()
export class CteBuilderAdapter implements ICteBuilderService {
  async buildCteXml(input: CteBuilderInput): Promise<Result<string, string>> {
    try {
      const xml = await buildCteXml({
        pickupOrderId: input.pickupOrderId,
        organizationId: input.organizationId,
      });
      return Result.ok(xml);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao gerar XML do CTe: ${message}`);
    }
  }
}
