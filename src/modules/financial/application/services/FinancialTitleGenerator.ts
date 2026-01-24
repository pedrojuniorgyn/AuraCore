/**
 * 💰 FINANCIAL TITLE GENERATOR - APPLICATION SERVICE
 * 
 * Application service for financial title generation from fiscal documents.
 * 
 * Responsibilities:
 * - Validate fiscal classification for title generation
 * - Generate payable titles from PURCHASE documents
 * - Generate receivable titles from CARGO/CTE documents
 * - Validate reversal conditions
 * 
 * Épico: E7.13 - Migration to DDD/Hexagonal Architecture
 * 
 * NOTA ARQUITETURAL:
 * Este serviço foi movido de domain/services para application/services porque:
 * - Possui dependência de repositório (estado)
 * - Usa @injectable() para DI
 * - Orquestra operações de persistência
 * Isso viola DOMAIN-SVC-001 (Domain Services devem ser stateless).
 */

import { injectable, inject } from 'tsyringe';
import { Result } from "@/shared/domain";
import { FinancialTitleError } from "../../domain/errors";
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type {
  IFinancialTitleRepository,
  FiscalDocumentData,
  AccountPayableInsert,
  AccountReceivableInsert,
} from '../../domain/ports/output/IFinancialTitleRepository';

export interface GeneratePayableInput {
  fiscalDocumentId: bigint;
  userId: string;
  organizationId: bigint;
}

export interface GenerateReceivableInput {
  fiscalDocumentId: bigint;
  userId: string;
  organizationId: bigint;
}

export interface ReverseTitlesInput {
  fiscalDocumentId: bigint;
  organizationId: bigint;
}

export interface TitleGenerationOutput {
  titleId: bigint;
  type: 'PAYABLE' | 'RECEIVABLE';
  amount: number;
}

/**
 * Application Service: Financial Title Generator
 */
@injectable()
export class FinancialTitleGenerator {
  constructor(
    @inject(TOKENS.FinancialTitleRepository)
    private readonly repository: IFinancialTitleRepository
  ) {}

  /**
   * Gera Conta a Pagar a partir de NFe PURCHASE
   */
  async generatePayable(
    input: GeneratePayableInput
  ): Promise<Result<TitleGenerationOutput, FinancialTitleError>> {
    const { fiscalDocumentId, userId, organizationId } = input;

    // 1. Buscar documento fiscal com validação de organização
    const documentResult = await this.repository.getFiscalDocumentById(
      fiscalDocumentId,
      organizationId
    );

    if (documentResult.isFailure) {
      return Result.fail(
        FinancialTitleError.documentNotFound(fiscalDocumentId)
      );
    }

    const document = documentResult.value;
    if (!document) {
      return Result.fail(
        FinancialTitleError.documentNotFound(fiscalDocumentId)
      );
    }

    // 2. Validar classificação fiscal
    if (document.fiscalClassification !== 'PURCHASE') {
      return Result.fail(
        FinancialTitleError.invalidClassification(
          document.fiscalClassification || 'UNKNOWN',
          'PURCHASE'
        )
      );
    }

    // 3. Validar se já existe título
    if (document.financialStatus !== 'NO_TITLE') {
      return Result.fail(
        FinancialTitleError.titleAlreadyExists(fiscalDocumentId)
      );
    }

    // 4. Preparar dados para criar Conta a Pagar
    const payableData: AccountPayableInsert = {
      organizationId: document.organizationId,
      branchId: document.branchId,
      partnerId: document.partnerId,
      fiscalDocumentId,
      description: `NFe ${document.documentNumber} - ${document.partnerName || 'N/A'}`,
      documentNumber: document.documentNumber,
      issueDate: document.issueDate,
      dueDate: document.issueDate, // TODO: extrair vencimento do XML
      amount: document.netAmount,
      amountPaid: 0,
      discount: 0,
      interest: 0,
      fine: 0,
      status: 'OPEN',
      origin: 'FISCAL_NFE',
      createdBy: userId,
      updatedBy: userId,
    };

    // 5. Criar conta a pagar
    const createResult = await this.repository.createAccountPayable(payableData);
    if (createResult.isFailure) {
      return Result.fail(
        new FinancialTitleError(
          `Erro ao criar conta a pagar: ${createResult.error}`
        )
      );
    }

    const payableId = createResult.value;

    // 6. Atualizar status do documento
    const updateResult =
      await this.repository.updateFiscalDocumentFinancialStatus(
        fiscalDocumentId,
        'GENERATED',
        organizationId
      );

    if (updateResult.isFailure) {
      return Result.fail(
        new FinancialTitleError(
          `Erro ao atualizar status do documento: ${updateResult.error}`
        )
      );
    }

    return Result.ok({
      titleId: payableId,
      type: 'PAYABLE',
      amount: document.netAmount,
    });
  }

  /**
   * Gera Conta a Receber a partir de CTe ou NFe CARGO
   */
  async generateReceivable(
    input: GenerateReceivableInput
  ): Promise<Result<TitleGenerationOutput, FinancialTitleError>> {
    const { fiscalDocumentId, userId, organizationId } = input;

    // 1. Buscar documento fiscal com validação de organização
    const documentResult = await this.repository.getFiscalDocumentById(
      fiscalDocumentId,
      organizationId
    );

    if (documentResult.isFailure) {
      return Result.fail(
        FinancialTitleError.documentNotFound(fiscalDocumentId)
      );
    }

    const document = documentResult.value;
    if (!document) {
      return Result.fail(
        FinancialTitleError.documentNotFound(fiscalDocumentId)
      );
    }

    // 2. Validar classificação fiscal
    const isValidClassification =
      document.fiscalClassification === 'CARGO' || document.documentType === 'CTE';

    if (!isValidClassification) {
      return Result.fail(
        FinancialTitleError.invalidClassification(
          document.fiscalClassification || document.documentType,
          'CARGO ou CTE'
        )
      );
    }

    // 3. Validar se já existe título
    if (document.financialStatus !== 'NO_TITLE') {
      return Result.fail(
        FinancialTitleError.titleAlreadyExists(fiscalDocumentId)
      );
    }

    // 4. Preparar dados para criar Conta a Receber
    const receivableData: AccountReceivableInsert = {
      organizationId: document.organizationId,
      branchId: document.branchId,
      partnerId: document.partnerId,
      fiscalDocumentId,
      description: `${document.documentType} ${document.documentNumber} - ${document.partnerName || 'N/A'}`,
      documentNumber: document.documentNumber,
      issueDate: document.issueDate,
      dueDate: document.issueDate, // TODO: calcular vencimento
      amount: document.netAmount,
      amountReceived: 0,
      discount: 0,
      interest: 0,
      fine: 0,
      status: 'OPEN',
      origin: 'FISCAL_CTE',
      createdBy: userId,
      updatedBy: userId,
    };

    // 5. Criar conta a receber
    const createResult =
      await this.repository.createAccountReceivable(receivableData);

    if (createResult.isFailure) {
      return Result.fail(
        new FinancialTitleError(
          `Erro ao criar conta a receber: ${createResult.error}`
        )
      );
    }

    const receivableId = createResult.value;

    // 6. Atualizar status do documento
    const updateResult =
      await this.repository.updateFiscalDocumentFinancialStatus(
        fiscalDocumentId,
        'GENERATED',
        organizationId
      );

    if (updateResult.isFailure) {
      return Result.fail(
        new FinancialTitleError(
          `Erro ao atualizar status do documento: ${updateResult.error}`
        )
      );
    }

    return Result.ok({
      titleId: receivableId,
      type: 'RECEIVABLE',
      amount: document.netAmount,
    });
  }

  /**
   * Reverte títulos gerados (soft delete)
   */
  async reverseTitles(
    input: ReverseTitlesInput
  ): Promise<Result<void, FinancialTitleError>> {
    const { fiscalDocumentId, organizationId } = input;

    // 1. Buscar documento
    const documentResult = await this.repository.getFiscalDocumentById(
      fiscalDocumentId,
      organizationId
    );

    if (documentResult.isFailure) {
      return Result.fail(
        FinancialTitleError.documentNotFound(fiscalDocumentId)
      );
    }

    const document = documentResult.value;
    if (!document) {
      return Result.fail(
        FinancialTitleError.documentNotFound(fiscalDocumentId)
      );
    }

    // 2. Validar se tem títulos gerados
    if (document.financialStatus === 'NO_TITLE') {
      return Result.fail(
        FinancialTitleError.titleNotFound(fiscalDocumentId)
      );
    }

    // 3. Verificar se títulos já foram pagos/recebidos
    const hasPaidResult = await this.repository.hasPaidTitles(
      fiscalDocumentId,
      organizationId
    );

    if (hasPaidResult.isFailure) {
      return Result.fail(
        new FinancialTitleError(
          `Erro ao verificar títulos pagos: ${hasPaidResult.error}`
        )
      );
    }

    if (hasPaidResult.value) {
      return Result.fail(FinancialTitleError.titleAlreadyPaid());
    }

    // 4. Reverter títulos (soft delete)
    const reverseResult = await this.repository.reverseTitles(
      fiscalDocumentId,
      organizationId
    );

    if (reverseResult.isFailure) {
      return Result.fail(
        new FinancialTitleError(
          `Erro ao reverter títulos: ${reverseResult.error}`
        )
      );
    }

    // 5. Atualizar status do documento
    const updateResult =
      await this.repository.updateFiscalDocumentFinancialStatus(
        fiscalDocumentId,
        'NO_TITLE',
        organizationId
      );

    if (updateResult.isFailure) {
      return Result.fail(
        new FinancialTitleError(
          `Erro ao atualizar status do documento: ${updateResult.error}`
        )
      );
    }

    return Result.ok(undefined);
  }
}
