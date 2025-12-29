import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import { IUseCaseWithContext, ExecutionContext } from './BaseUseCase';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import { FiscalDocumentNotFoundError } from '../../domain/errors/FiscalErrors';
import { FiscalKey } from '../../domain/value-objects/FiscalKey';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

export interface AuthorizeFiscalDocumentInput {
  id: string;
  fiscalKey: string;
  protocolNumber: string;
  protocolDate: Date;
}

export interface AuthorizeFiscalDocumentOutput {
  id: string;
  status: string;
  fiscalKey: string;
  protocolNumber: string;
}

/**
 * Use Case: Authorize Fiscal Document
 *
 * Autoriza um documento fiscal após processamento pela SEFAZ.
 * Transição de estado: PROCESSING → AUTHORIZED
 */
@injectable()
export class AuthorizeFiscalDocumentUseCase implements IUseCaseWithContext<AuthorizeFiscalDocumentInput, AuthorizeFiscalDocumentOutput> {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository
  ) {}

  async execute(
    input: AuthorizeFiscalDocumentInput,
    context: ExecutionContext
  ): Promise<Result<AuthorizeFiscalDocumentOutput, string>> {
    try {
      // Buscar documento (BUG 2 FIX: passar branchId)
      const document = await this.repository.findById(input.id, context.organizationId, context.branchId);
      if (!document) {
        return Result.fail(new FiscalDocumentNotFoundError(input.id).message);
      }

      // Admin pode buscar qualquer branch, mas repository já filtrou por branchId do context
      // Se admin precisa acessar outra branch, precisa mudar o context.branchId antes

      // Converter fiscal key para FiscalKey value object
      const fiscalKeyResult = FiscalKey.create(input.fiscalKey);
      if (Result.isFail(fiscalKeyResult)) {
        return Result.fail(`Invalid fiscal key: ${fiscalKeyResult.error}`);
      }

      // Autorizar documento
      const authorizeResult = document.authorize({
        fiscalKey: fiscalKeyResult.value,
        protocolNumber: input.protocolNumber,
        protocolDate: input.protocolDate,
      });
      if (Result.isFail(authorizeResult)) {
        return Result.fail(authorizeResult.error);
      }

      // Persistir
      await this.repository.save(document);

      return Result.ok({
        id: document.id,
        status: document.status,
        fiscalKey: input.fiscalKey,
        protocolNumber: input.protocolNumber,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Failed to authorize fiscal document: ${errorMessage}`);
    }
  }
}

