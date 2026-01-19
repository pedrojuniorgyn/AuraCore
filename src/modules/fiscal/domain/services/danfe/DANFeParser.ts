/**
 * DANFe Parser - Domain Service
 *
 * Parser principal que orquestra a extração de dados do DANFe.
 * 100% Stateless, ZERO dependências externas.
 *
 * @module fiscal/domain/services/danfe
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see E-Agent-Fase-D2
 */

import { Result } from '@/shared/domain';
import type {
  DocumentExtractionResult,
  DANFeData,
} from '@/shared/infrastructure/docling';
import { DANFeFieldExtractor } from './DANFeFieldExtractor';
import { DANFeValidator } from './DANFeValidator';

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Parser de DANFe
 *
 * Converte resultado do Docling em DANFeData estruturado.
 *
 * Regras:
 * - DOMAIN-SVC-001: 100% Stateless (métodos estáticos)
 * - DOMAIN-SVC-002: Constructor privado
 * - DOMAIN-SVC-003: Retorna Result<T, string>
 * - DOMAIN-SVC-004: NUNCA faz throw
 * - DOMAIN-SVC-005: ZERO dependências de infraestrutura
 * - DOMAIN-SVC-006: ZERO acesso a banco de dados
 * - DOMAIN-SVC-007: 100% testável sem mocks
 * - DOMAIN-SVC-008: Lógica de negócio PURA
 */
export class DANFeParser {
  // Impede instanciação
  private constructor() {}

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Converte resultado do Docling em DANFeData estruturado.
   *
   * @param extraction - Resultado da extração do Docling
   * @returns DANFeData estruturado ou erro
   */
  static parseFromDoclingResult(
    extraction: DocumentExtractionResult
  ): Result<DANFeData, string> {
    // Validar input
    if (!extraction || !extraction.text) {
      return Result.fail('Resultado da extração vazio ou inválido');
    }

    // 1. Extrair chave de acesso (44 dígitos)
    const chaveResult = DANFeFieldExtractor.extractChaveAcesso(extraction.text);
    if (Result.isFail(chaveResult)) {
      return Result.fail(`Chave de acesso: ${chaveResult.error}`);
    }

    // 2. Validar chave de acesso
    const chaveValidation = DANFeValidator.validateChaveAcesso(chaveResult.value);
    if (Result.isFail(chaveValidation)) {
      return Result.fail(`Chave de acesso: ${chaveValidation.error}`);
    }

    // 3. Extrair dados do emitente
    const emitenteResult = DANFeFieldExtractor.extractEmitente(
      extraction.text,
      extraction.tables
    );
    if (Result.isFail(emitenteResult)) {
      return Result.fail(`Emitente: ${emitenteResult.error}`);
    }

    // 4. Extrair dados do destinatário
    const destinatarioResult = DANFeFieldExtractor.extractDestinatario(
      extraction.text,
      extraction.tables
    );
    if (Result.isFail(destinatarioResult)) {
      return Result.fail(`Destinatário: ${destinatarioResult.error}`);
    }

    // 5. Extrair produtos
    const produtosResult = DANFeFieldExtractor.extractProdutos(extraction.tables);
    if (Result.isFail(produtosResult)) {
      return Result.fail(`Produtos: ${produtosResult.error}`);
    }

    // 6. Extrair totais
    const totaisResult = DANFeFieldExtractor.extractTotais(
      extraction.text,
      extraction.tables
    );
    if (Result.isFail(totaisResult)) {
      return Result.fail(`Totais: ${totaisResult.error}`);
    }

    // 7. Extrair número e série da chave
    const numero = DANFeFieldExtractor.extractNumeroFromChave(chaveResult.value);
    const serie = DANFeFieldExtractor.extractSerieFromChave(chaveResult.value);

    // 8. Extrair data de emissão
    const dataEmissao = DANFeFieldExtractor.extractDataEmissao(extraction.text);

    // 9. Montar DANFeData
    const danfe: DANFeData = {
      chaveAcesso: chaveResult.value,
      numero,
      serie,
      dataEmissao,
      emitente: emitenteResult.value,
      destinatario: destinatarioResult.value,
      produtos: produtosResult.value,
      totais: totaisResult.value,
    };

    // 10. Validar dados extraídos
    const validationResult = DANFeValidator.validate(danfe);
    if (Result.isFail(validationResult)) {
      return Result.fail(`Validação: ${validationResult.error}`);
    }

    return Result.ok(danfe);
  }

  /**
   * Extrai apenas a chave de acesso do texto.
   * Método de conveniência para validação rápida.
   */
  static extractChaveAcesso(text: string): Result<string, string> {
    return DANFeFieldExtractor.extractChaveAcesso(text);
  }

  /**
   * Valida um DANFeData já extraído.
   */
  static validate(danfe: DANFeData): Result<void, string> {
    return DANFeValidator.validate(danfe);
  }
}
