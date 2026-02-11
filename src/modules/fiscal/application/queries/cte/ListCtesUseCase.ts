/**
 * ListCtesUseCase - Application Query
 *
 * Caso de uso para listagem paginada de CTes (Conhecimento de Transporte Eletrônico).
 * Filtra documentos fiscais por documentType: 'CTE' e aplica multi-tenancy.
 *
 * @module fiscal/application/use-cases
 * @see ARCH-010: Implementa IListCtesUseCase
 * @see IFiscalDocumentRepository - Repository compartilhado
 * @see ListFiscalDocumentsUseCase - Use Case genérico de referência
 */

import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../../domain/ports/output/IFiscalDocumentRepository';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type {
  IListCtesUseCase,
  ListCtesInput,
  ListCtesOutput,
  CteListItemDto,
} from '../../../domain/ports/input/IListCtesUseCase';
import type { ExecutionContext } from '../../../domain/ports/input/IAuthorizeFiscalDocument';
import type { DocumentStatus } from '../../../domain/value-objects/DocumentType';

/**
 * Query: Listagem paginada de CTes.
 *
 * Fluxo:
 * 1. Validar input (paginação)
 * 2. Consultar repository com filtro documentType: ['CTE']
 * 3. Mapear FiscalDocument[] para CteListItemDto[]
 * 4. Retornar resultado paginado
 */
@injectable()
export class ListCtesUseCase implements IListCtesUseCase {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private readonly repository: IFiscalDocumentRepository
  ) {}

  async execute(
    input: ListCtesInput,
    context: ExecutionContext
  ): Promise<Result<ListCtesOutput, string>> {
    try {
      // 1. Validar input
      const validationResult = this.validateInput(input);
      if (Result.isFail(validationResult)) {
        return validationResult;
      }

      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 20;

      // 2. Montar filtro com documentType fixo em CTE
      const filter = {
        organizationId: context.organizationId,
        branchId: context.branchId,
        documentType: ['CTE' as const],
        status: input.status as DocumentStatus[] | undefined,
        issueDateFrom: input.issueDateFrom,
        issueDateTo: input.issueDateTo,
        search: input.search,
      };

      const pagination = {
        page,
        pageSize,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      };

      // 3. Consultar repository
      const result = await this.repository.findMany(filter, pagination);

      // 4. Mapear para CteListItemDto
      const items: CteListItemDto[] = result.data.map((doc) => {
        const fiscalDoc = doc as unknown as {
          id: string;
          series: string;
          number: string;
          status: string;
          fiscalKey?: { value: string };
          issueDate: Date;
          totalDocument: { amount: number };
          issuerName?: string;
          recipientName?: string;
          notes?: string;
          createdAt: Date;
        };

        return {
          id: fiscalDoc.id,
          series: fiscalDoc.series,
          number: fiscalDoc.number,
          status: fiscalDoc.status,
          fiscalKey: fiscalDoc.fiscalKey?.value,
          issueDate: fiscalDoc.issueDate,
          totalValue: fiscalDoc.totalDocument.amount,
          senderName: fiscalDoc.issuerName,
          recipientName: fiscalDoc.recipientName,
          originCity: undefined, // TODO: Extrair de campos específicos de CTe quando disponível
          destinationCity: undefined, // TODO: Extrair de campos específicos de CTe quando disponível
          createdAt: fiscalDoc.createdAt,
        };
      });

      const totalPages = Math.ceil(result.total / pageSize);

      return Result.ok({
        items,
        total: result.total,
        page,
        pageSize,
        totalPages,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao listar CTes: ${errorMessage}`);
    }
  }

  /**
   * Valida parâmetros de entrada
   */
  private validateInput(input: ListCtesInput): Result<void, string> {
    if (input.page !== undefined && input.page < 1) {
      return Result.fail('Página deve ser >= 1');
    }
    if (input.pageSize !== undefined && (input.pageSize < 1 || input.pageSize > 100)) {
      return Result.fail('Tamanho da página deve ser entre 1 e 100');
    }
    return Result.ok(undefined);
  }
}
