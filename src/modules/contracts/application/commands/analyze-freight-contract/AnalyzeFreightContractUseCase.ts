/**
 * AnalyzeFreightContractUseCase - Application Command
 *
 * Caso de uso para análise de contratos de frete.
 *
 * @module contracts/application/commands/analyze-freight-contract
 * @see USE-CASE-001 a USE-CASE-015
 * @see E-Agent-Fase-D5
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@/shared/domain';
import type {
  IAnalyzeFreightContractUseCase,
  AnalyzeFreightContractInput,
  AnalyzeFreightContractOutput,
} from '@/modules/contracts/domain/ports/input';
import type { FreightContractData, RiskAnalysis } from '@/modules/contracts/domain/types';
import { FreightContractParser, FreightContractAnalyzer } from '@/modules/contracts/domain/services';
import type { DoclingClient } from '@/shared/infrastructure/docling';
import { TOKENS } from '@/shared/infrastructure/di/tokens';

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Caso de uso para análise de contratos de frete.
 *
 * Fluxo:
 * 1. Processar PDF com Docling
 * 2. Fazer parsing com FreightContractParser
 * 3. Analisar riscos com FreightContractAnalyzer
 */
@injectable()
export class AnalyzeFreightContractUseCase implements IAnalyzeFreightContractUseCase {
  constructor(
    @inject(TOKENS.DoclingClient)
    private readonly doclingClient: DoclingClient
  ) {}

  /**
   * Executa a análise de um contrato de frete.
   */
  async execute(
    input: AnalyzeFreightContractInput
  ): Promise<Result<AnalyzeFreightContractOutput, string>> {
    const startTime = Date.now();

    // 1. Validar input
    const validationResult = this.validateInput(input);
    if (Result.isFail(validationResult)) {
      return validationResult;
    }

    // 2. Processar PDF com Docling
    const extractionResult = await this.doclingClient.processDocument(input.filePath);

    if (Result.isFail(extractionResult)) {
      return Result.fail(`Erro ao processar PDF: ${extractionResult.error}`);
    }

    const extraction = extractionResult.value;

    // 3. Fazer parsing do contrato
    const parseResult = FreightContractParser.parseFromDoclingResult(
      extraction,
      input.fileName
    );

    if (Result.isFail(parseResult)) {
      return Result.fail(`Erro ao extrair dados: ${parseResult.error}`);
    }

    const parsedContract = parseResult.value;

    // 4. Analisar riscos (se não for skipado)
    let riskAnalysis: RiskAnalysis;

    if (!input.options?.skipRiskAnalysis) {
      const analysisResult = FreightContractAnalyzer.analyze(parsedContract);

      if (Result.isFail(analysisResult)) {
        return Result.fail(`Erro na análise de risco: ${analysisResult.error}`);
      }

      riskAnalysis = analysisResult.value;
    } else {
      riskAnalysis = this.defaultRiskAnalysis();
    }

    // 5. Montar resultado final
    const contract: FreightContractData = {
      ...parsedContract,
      riskAnalysis,
    };

    // Atualizar tempo de processamento
    contract.extractionMetadata.processingTimeMs = Date.now() - startTime;

    return Result.ok({
      contract,
      rawText: input.options?.includeRawText ? extraction.text : undefined,
    });
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Valida input do caso de uso.
   */
  private validateInput(
    input: AnalyzeFreightContractInput
  ): Result<void, string> {
    if (!input) {
      return Result.fail('Input é obrigatório');
    }

    if (!input.filePath) {
      return Result.fail('Caminho do arquivo é obrigatório');
    }

    if (!input.fileName) {
      return Result.fail('Nome do arquivo é obrigatório');
    }

    const trimmedPath = input.filePath.trim();
    if (trimmedPath.length === 0) {
      return Result.fail('Caminho do arquivo não pode ser vazio');
    }

    return Result.ok(undefined);
  }

  /**
   * Análise de risco padrão quando skipada.
   */
  private defaultRiskAnalysis(): RiskAnalysis {
    return {
      overallScore: 50,
      riskLevel: 'MEDIO',
      alerts: [],
      recommendations: ['Análise de risco não realizada'],
      complianceChecklist: [],
    };
  }
}
