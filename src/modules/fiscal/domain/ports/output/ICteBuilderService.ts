/**
 * ICteBuilderService - Output Port
 *
 * Interface para construcao de XML de CTe.
 * Isola o Use Case do servico legacy de geracao de XML.
 *
 * @see ARCH-011: Repositories/Services implementam interface de domain/ports/output/
 * @see ARCH-006: Dependencias apontam para Domain (inward)
 */
import { Result } from '@/shared/domain';

export interface CteBuilderInput {
  pickupOrderId: number;
  organizationId: number;
}

export interface ICteBuilderService {
  /**
   * Gera XML do CTe a partir dos dados da ordem de coleta
   */
  buildCteXml(input: CteBuilderInput): Promise<Result<string, string>>;
}
