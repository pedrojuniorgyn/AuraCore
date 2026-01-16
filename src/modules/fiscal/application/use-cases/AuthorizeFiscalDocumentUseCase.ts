import { inject, injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import type { ISefazService } from '../../domain/ports/output/ISefazService';
import type { FiscalAccountingIntegration } from '../services/FiscalAccountingIntegration';
import { FiscalDocumentNotFoundError } from '../../domain/errors/FiscalErrors';
import { FiscalKey } from '../../domain/value-objects/FiscalKey';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import {
  IAuthorizeFiscalDocument,
  AuthorizeFiscalDocumentInput,
  AuthorizeFiscalDocumentOutput,
  ExecutionContext,
} from '../../domain/ports/input';

/**
 * Use Case: Authorize Fiscal Document
 *
 * Autoriza um documento fiscal após processamento pela SEFAZ.
 * Transição de estado: SUBMITTED → AUTHORIZED
 * 
 * Integrações:
 * - SEFAZ: Solicita autorização do documento
 * - Accounting: Gera lançamento contábil automático
 * 
 * @see ARCH-010: Implementa IAuthorizeFiscalDocument
 */
@injectable()
export class AuthorizeFiscalDocumentUseCase implements IAuthorizeFiscalDocument {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private repository: IFiscalDocumentRepository,
    @inject(TOKENS.SefazService) private sefazService: ISefazService,
    @inject(TOKENS.FiscalAccountingIntegration) private accountingIntegration: FiscalAccountingIntegration
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

      // Solicitar autorização na SEFAZ
      const sefazResult = await this.sefazService.authorize(input.fiscalKey);
      if (Result.isFail(sefazResult)) {
        return Result.fail(`SEFAZ authorization failed: ${sefazResult.error}`);
      }

      // Verificar se SEFAZ autorizou
      if (!sefazResult.value.authorized) {
        return Result.fail(
          `SEFAZ rejected authorization: ${sefazResult.value.statusCode} - ${sefazResult.value.statusMessage}`
        );
      }

      // Autorizar documento no domain
      const authorizeResult = document.authorize({
        fiscalKey: fiscalKeyResult.value,
        protocolNumber: sefazResult.value.protocolNumber,
        protocolDate: sefazResult.value.authorizedAt,
      });
      if (Result.isFail(authorizeResult)) {
        return Result.fail(authorizeResult.error);
      }

      // Persistir documento autorizado
      await this.repository.save(document);

      // Gerar lançamento contábil automático
      const accountingResult = await this.accountingIntegration.generateJournalEntryForAuthorizedDocument(
        document,
        {
          userId: context.userId,
          organizationId: context.organizationId,
          branchId: context.branchId
        }
      );

      // Log accounting result (não falhamos o Use Case se contabilização falhar)
      if (Result.isFail(accountingResult)) {
        console.warn(
          `[AuthorizeFiscalDocumentUseCase] Accounting integration failed for document ${document.id}: ${accountingResult.error}`
        );
      } else {
        console.log(
          `[AuthorizeFiscalDocumentUseCase] Journal entry created: ${accountingResult.value}`
        );
      }

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

