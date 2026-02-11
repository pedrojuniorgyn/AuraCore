import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { ISefazService } from '../../domain/ports/output/ISefazService';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import {
  IQuerySefazStatus,
  QuerySefazStatusInput,
  QuerySefazStatusOutput,
  ExecutionContext,
} from '../../domain/ports/input';

/**
 * Use Case: Query SEFAZ Status
 * 
 * @see ARCH-010: Implementa IQuerySefazStatus
 */
@injectable()
export class QuerySefazStatusUseCase implements IQuerySefazStatus {
  constructor(
    @inject(TOKENS.SefazService) private sefazService: ISefazService
  ) {}

  async execute(
    input: QuerySefazStatusInput,
    _context: ExecutionContext
  ): Promise<Result<QuerySefazStatusOutput, string>> {
    try {
      // TODO: Implementar consulta real à SEFAZ
      // Por enquanto, retorna stub

      const fiscalKey = input.documentIdOrFiscalKey.length === 44 
        ? input.documentIdOrFiscalKey 
        : '00000000000000000000000000000000000000000000';

      return Result.ok({
        documentId: input.documentIdOrFiscalKey,
        sefazStatus: {
          fiscalKey,
          status: 'AUTHORIZED',
          statusCode: '100',
          statusMessage: 'Autorizado o uso da NF-e',
          protocolNumber: '123456789012345',
          authorizedAt: new Date(),
          lastCheckedAt: new Date(),
        },
        queriedAt: new Date(),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to query SEFAZ status: ${errorMessage}`);
    }
  }
}
