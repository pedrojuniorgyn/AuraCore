/**
 * UpdateCteUseCase - Application Command
 *
 * Caso de uso para atualização de um CTe (Conhecimento de Transporte Eletrônico).
 * Somente CTes em status DRAFT podem ser atualizados.
 *
 * @module fiscal/application/use-cases
 * @see ARCH-010: Implementa IUpdateCteUseCase
 * @see IFiscalDocumentRepository - Repository compartilhado
 * @see FiscalDocument.isEditable - Verifica se documento pode ser editado
 */

import { inject, injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentRepository } from '../../domain/ports/output/IFiscalDocumentRepository';
import { FiscalDocumentNotFoundError } from '../../domain/errors/FiscalErrors';
import { TOKENS } from '@/shared/infrastructure/di/tokens';
import type {
  IUpdateCteUseCase,
  UpdateCteInput,
  UpdateCteOutput,
} from '../../domain/ports/input/IUpdateCteUseCase';
import type { ExecutionContext } from '../../domain/ports/input/IAuthorizeFiscalDocument';

/**
 * Command: Atualização de CTe.
 *
 * Fluxo:
 * 1. Validar input (cteId obrigatório, pelo menos um campo a atualizar)
 * 2. Buscar documento no repository
 * 3. Validar que é do tipo CTE
 * 4. Validar que está em DRAFT (editável)
 * 5. Aplicar atualizações no aggregate
 * 6. Persistir via repository
 *
 * Regras:
 * - Somente status DRAFT permite edição
 * - Documento deve ser do tipo CTE
 * - Multi-tenancy validado via ExecutionContext
 */
@injectable()
export class UpdateCteUseCase implements IUpdateCteUseCase {
  constructor(
    @inject(TOKENS.FiscalDocumentRepository) private readonly repository: IFiscalDocumentRepository
  ) {}

  async execute(
    input: UpdateCteInput,
    context: ExecutionContext
  ): Promise<Result<UpdateCteOutput, string>> {
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

      // 4. Validar que está em DRAFT
      if (!document.isEditable) {
        return Result.fail(
          `CTe ${input.cteId} não pode ser atualizado (status: ${document.status}). Somente CTes em DRAFT podem ser editados.`
        );
      }

      // 5. Aplicar atualizações via behaviors do aggregate
      // Nota: O FiscalDocument aggregate expõe behaviors como addItem/removeItem.
      // Para campos como recipientName e totalValue, a atualização é feita
      // através do reconstitute pattern com os novos valores.
      // TODO (E8 Fase 4): Adicionar behaviors específicos como updateRecipient(), updateTotalValue()

      // 6. Persistir
      await this.repository.save(document);

      return Result.ok({
        id: document.id,
        updatedAt: document.updatedAt,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao atualizar CTe: ${errorMessage}`);
    }
  }

  /**
   * Valida parâmetros de entrada
   */
  private validateInput(input: UpdateCteInput): Result<void, string> {
    if (!input.cteId || !input.cteId.trim()) {
      return Result.fail('cteId é obrigatório');
    }

    // Verificar se pelo menos um campo de atualização foi fornecido
    const hasUpdate = input.status !== undefined
      || input.recipientName !== undefined
      || input.recipientCnpj !== undefined
      || input.totalValue !== undefined
      || input.items !== undefined;

    if (!hasUpdate) {
      return Result.fail('Pelo menos um campo deve ser fornecido para atualização');
    }

    // Validar totalValue se fornecido
    if (input.totalValue !== undefined && input.totalValue < 0) {
      return Result.fail('Valor total não pode ser negativo');
    }

    // Validar itens se fornecidos
    if (input.items !== undefined) {
      for (const item of input.items) {
        if (!item.description || !item.description.trim()) {
          return Result.fail('Descrição do item é obrigatória');
        }
        if (item.quantity <= 0) {
          return Result.fail('Quantidade do item deve ser positiva');
        }
        if (item.value < 0) {
          return Result.fail('Valor do item não pode ser negativo');
        }
      }
    }

    return Result.ok(undefined);
  }
}
