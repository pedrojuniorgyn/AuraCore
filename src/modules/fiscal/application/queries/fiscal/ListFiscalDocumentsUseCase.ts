import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../../domain/ports/output/IFiscalDocumentRepository';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import {
  IListFiscalDocuments,
  ListFiscalDocumentsInput,
  ListFiscalDocumentsOutput,
  ExecutionContext,
} from '../../../domain/ports/input';
import type { DocumentType, DocumentStatus } from '../../../domain/value-objects/DocumentType';

/**
 * Use Case: List Fiscal Documents
 * 
 * @see ARCH-010: Implementa IListFiscalDocuments
 */
@injectable()
export class ListFiscalDocumentsUseCase implements IListFiscalDocuments {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository
  ) {}

  async execute(
    input: ListFiscalDocumentsInput,
    context: ExecutionContext
  ): Promise<Result<ListFiscalDocumentsOutput, string>> {
    try {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 20;

      // Separar filter e pagination conforme interface IFiscalDocumentRepository
      const filter = {
        organizationId: context.organizationId,
        branchId: context.branchId,
        // Cast string[] para tipos específicos (valores vêm validados da API)
        documentType: input.documentType as DocumentType[] | undefined,
        status: input.status as DocumentStatus[] | undefined,
        issueDateFrom: input.issueDateFrom,
        issueDateTo: input.issueDateTo,
        recipientCnpjCpf: input.recipientDocument,
        search: input.search,
      };

      const pagination = {
        page,
        pageSize,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      };

      const result = await this.repository.findMany(filter, pagination);

      const items = result.data.map((doc: unknown) => {
        const fiscalDoc = doc as {
          id: string;
          documentType: string;
          series: string;
          number: string;
          status: string;
          fiscalKey?: { value: string };
          issueDate: Date;
          totalDocument: { amount: number };
          recipientCnpjCpf?: string;
          recipientName?: string;
          createdAt: Date;
          updatedAt: Date;
        };
        return {
          id: fiscalDoc.id,
          documentType: fiscalDoc.documentType,
          series: fiscalDoc.series,
          number: fiscalDoc.number,
          status: fiscalDoc.status,
          fiscalKey: fiscalDoc.fiscalKey?.value,
          issueDate: fiscalDoc.issueDate,
          totalValue: fiscalDoc.totalDocument.amount,
          recipient: {
            document: fiscalDoc.recipientCnpjCpf ?? '',
            name: fiscalDoc.recipientName ?? '',
          },
          createdAt: fiscalDoc.createdAt,
          updatedAt: fiscalDoc.updatedAt,
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
      return Result.fail(`Failed to list fiscal documents: ${errorMessage}`);
    }
  }
}
