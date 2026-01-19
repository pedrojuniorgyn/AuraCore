/**
 * ImportDACTeUseCase - Application Command
 *
 * Caso de uso para importação de DACTe PDF.
 * Orquestra Docling e DACTeParser.
 *
 * @module fiscal/application/commands/import-dacte
 * @see USE-CASE-001 a USE-CASE-015
 * @see E-Agent-Fase-D3
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IImportDACTeUseCase,
  ImportDACTeInput,
  ImportDACTeOutput,
} from '@/modules/fiscal/domain/ports/input';
import { DACTeParser } from '@/modules/fiscal/domain/services/dacte';
import type { DoclingClient } from '@/shared/infrastructure/docling';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Caso de uso para importação de DACTe PDF.
 *
 * Regras:
 * - USE-CASE-001: Commands em application/commands/
 * - USE-CASE-003: Implementa interface de domain/ports/input/
 * - USE-CASE-004: Método único: execute()
 * - USE-CASE-006: Retorna Promise<Result<Output, string>>
 * - USE-CASE-010: Usa DI para dependencies
 * - USE-CASE-011: @injectable() decorator
 */
@injectable()
export class ImportDACTeUseCase implements IImportDACTeUseCase {
  constructor(
    @inject(TOKENS.DoclingClient)
    private readonly doclingClient: DoclingClient
  ) {}

  /**
   * Executa a importação de um DACTe PDF.
   *
   * Fluxo:
   * 1. Validar input
   * 2. Processar PDF com Docling
   * 3. Fazer parsing do resultado
   * 4. Retornar dados estruturados
   */
  async execute(input: ImportDACTeInput): Promise<Result<ImportDACTeOutput, string>> {
    // 1. Validar input
    const validationResult = this.validateInput(input);
    if (Result.isFail(validationResult)) {
      return validationResult;
    }

    // 2. Processar PDF com Docling
    const extractionResult = await this.doclingClient.processDocument(
      input.filePath
    );

    if (Result.isFail(extractionResult)) {
      return Result.fail(`Erro ao processar PDF: ${extractionResult.error}`);
    }

    const extraction = extractionResult.value;

    // 3. Fazer parsing do resultado
    const parseResult = DACTeParser.parseFromDoclingResult(extraction);

    if (Result.isFail(parseResult)) {
      return Result.fail(`Erro ao extrair dados: ${parseResult.error}`);
    }

    // 4. Retornar dados estruturados
    const output: ImportDACTeOutput = {
      dacte: parseResult.value,
      extractionMetadata: {
        processingTimeMs: extraction.processingTimeMs,
        pageCount: extraction.metadata.pageCount,
        tablesFound: extraction.tables.length,
        documentsFound: parseResult.value.documentos.length,
      },
    };

    return Result.ok(output);
  }

  /**
   * Valida input do caso de uso.
   */
  private validateInput(input: ImportDACTeInput): Result<void, string> {
    if (!input) {
      return Result.fail('Input é obrigatório');
    }

    if (!input.filePath) {
      return Result.fail('Caminho do arquivo é obrigatório');
    }

    if (typeof input.filePath !== 'string') {
      return Result.fail('Caminho do arquivo deve ser uma string');
    }

    // Validar extensão
    if (!input.filePath.toLowerCase().endsWith('.pdf')) {
      return Result.fail('Arquivo deve ser um PDF');
    }

    // Prevenir path traversal
    if (input.filePath.includes('..') || input.filePath.startsWith('/')) {
      return Result.fail('Caminho do arquivo inválido');
    }

    return Result.ok(undefined);
  }
}
