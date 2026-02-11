/**
 * GetCteByIdUseCase - Application Query
 *
 * Caso de uso para consulta de um CTe (Conhecimento de Transporte Eletrônico) por ID.
 * Valida que o documento é do tipo CTE e mapeia para DTO detalhado com itens.
 *
 * @module fiscal/application/use-cases
 * @see ARCH-010: Implementa IGetCteByIdUseCase
 * @see IFiscalDocumentRepository - Repository compartilhado
 * @see GetFiscalDocumentByIdUseCase - Use Case genérico de referência
 */

import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../../domain/ports/output/IFiscalDocumentRepository';
import { FiscalDocumentNotFoundError } from '../../../domain/errors/FiscalErrors';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type {
  IGetCteByIdUseCase,
  GetCteByIdInput,
  CteDetailDto,
} from '../../../domain/ports/input/IGetCteByIdUseCase';
import type { ExecutionContext } from '../../../domain/ports/input/IAuthorizeFiscalDocument';

/**
 * Query: Consulta de CTe por ID.
 *
 * Fluxo:
 * 1. Validar input (cteId obrigatório)
 * 2. Buscar documento no repository
 * 3. Validar que é do tipo CTE
 * 4. Mapear FiscalDocument para CteDetailDto (com itens)
 */
@injectable()
export class GetCteByIdUseCase implements IGetCteByIdUseCase {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private readonly repository: IFiscalDocumentRepository
  ) {}

  async execute(
    input: GetCteByIdInput,
    context: ExecutionContext
  ): Promise<Result<CteDetailDto, string>> {
    try {
      // 1. Validar input
      const validationResult = this.validateInput(input);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      // 2. Buscar documento
      const document = await this.repository.findById(
        input.cteId,
        context.organizationId,
        context.branchId
      );

      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.cteId).message);
      }

      // 3. Validar que é do tipo CTE
      if (document.documentType !== 'CTE') {
        return Result.fail(
          `Documento ${input.cteId} não é um CTe (tipo: ${document.documentType})`
        );
      }

      // 4. Mapear para CteDetailDto
      const items = document.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        value: item.totalPrice.amount,
      }));

      return Result.ok({
        id: document.id,
        series: document.series,
        number: document.number,
        status: document.status,
        fiscalKey: document.fiscalKey?.value,
        issueDate: document.issueDate,
        totalValue: document.totalDocument.amount,
        senderCnpj: document.issuerCnpj,
        senderName: document.issuerName,
        recipientCnpj: document.recipientCnpjCpf,
        recipientName: document.recipientName,
        originCity: undefined, // TODO: Extrair de campos específicos de CTe quando disponível
        destinationCity: undefined, // TODO: Extrair de campos específicos de CTe quando disponível
        items,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao buscar CTe: ${errorMessage}`);
    }
  }

  /**
   * Valida parâmetros de entrada
   */
  private validateInput(input: GetCteByIdInput): Result<void, string> {
    if (!input.cteId || !input.cteId.trim()) {
      return Result.fail('cteId é obrigatório');
    }
    return Result.ok(undefined);
  }
}
