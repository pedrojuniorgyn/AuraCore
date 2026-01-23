/**
 * DACTe Parser - Domain Service
 *
 * Parser principal que orquestra a extração de dados do DACTe.
 * 100% Stateless, ZERO dependências externas.
 *
 * @module fiscal/domain/services/dacte
 * @see DOMAIN-SVC-001 a DOMAIN-SVC-010
 * @see E-Agent-Fase-D3
 */

import { Result } from '@/shared/domain';
import type {
  DocumentExtractionResult,
  DACTeData,
} from '@/shared/domain';
import { DACTeFieldExtractor } from './DACTeFieldExtractor';
import { DACTeValidator } from './DACTeValidator';

// ============================================================================
// DOMAIN SERVICE
// ============================================================================

/**
 * Parser de DACTe
 *
 * Converte resultado do Docling em DACTeData estruturado.
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
export class DACTeParser {
  // Impede instanciação
  private constructor() {}

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Converte resultado do Docling em DACTeData estruturado.
   *
   * @param extraction - Resultado da extração do Docling
   * @returns DACTeData estruturado ou erro
   */
  static parseFromDoclingResult(
    extraction: DocumentExtractionResult
  ): Result<DACTeData, string> {
    // Validar input
    if (!extraction || !extraction.text) {
      return Result.fail('Resultado da extração vazio ou inválido');
    }

    // 1. Extrair chave CTe (44 dígitos, modelo 57)
    const chaveResult = DACTeFieldExtractor.extractChaveCTe(extraction.text);
    if (Result.isFail(chaveResult)) {
      return Result.fail(`Chave CTe: ${chaveResult.error}`);
    }

    // 2. Validar chave CTe
    const chaveValidation = DACTeValidator.validateChaveCTe(chaveResult.value);
    if (Result.isFail(chaveValidation)) {
      return Result.fail(`Chave CTe: ${chaveValidation.error}`);
    }

    // 3. Extrair modal e tipo de serviço
    const modalResult = DACTeFieldExtractor.extractModal(extraction.text);
    const tipoServicoResult = DACTeFieldExtractor.extractTipoServico(extraction.text);

    // 4. Extrair CFOP
    const cfopResult = DACTeFieldExtractor.extractCFOP(extraction.text);
    const cfop = Result.isOk(cfopResult) ? cfopResult.value : '5353';

    // 5. Extrair natureza da operação
    const naturezaOperacao = DACTeFieldExtractor.extractNaturezaOperacao(extraction.text);

    // 6. Extrair participantes
    const emitenteResult = DACTeFieldExtractor.extractEmitente(
      extraction.text,
      extraction.tables
    );
    if (Result.isFail(emitenteResult)) {
      return Result.fail(`Emitente: ${emitenteResult.error}`);
    }

    const remetenteResult = DACTeFieldExtractor.extractRemetente(
      extraction.text,
      extraction.tables
    );
    if (Result.isFail(remetenteResult)) {
      return Result.fail(`Remetente: ${remetenteResult.error}`);
    }

    const destinatarioResult = DACTeFieldExtractor.extractDestinatario(
      extraction.text,
      extraction.tables
    );
    if (Result.isFail(destinatarioResult)) {
      return Result.fail(`Destinatário: ${destinatarioResult.error}`);
    }

    // Expedidor e Recebedor são opcionais
    const expedidorResult = DACTeFieldExtractor.extractExpedidor(
      extraction.text,
      extraction.tables
    );
    const recebedorResult = DACTeFieldExtractor.extractRecebedor(
      extraction.text,
      extraction.tables
    );

    // 7. Extrair carga e volumes
    const cargaResult = DACTeFieldExtractor.extractCarga(
      extraction.text,
      extraction.tables
    );
    if (Result.isFail(cargaResult)) {
      return Result.fail(`Carga: ${cargaResult.error}`);
    }

    // 8. Extrair documentos transportados
    const documentosResult = DACTeFieldExtractor.extractDocumentos(extraction.tables);
    if (Result.isFail(documentosResult)) {
      return Result.fail(`Documentos: ${documentosResult.error}`);
    }

    // 9. Extrair valores
    const valoresResult = DACTeFieldExtractor.extractValores(
      extraction.text,
      extraction.tables
    );
    if (Result.isFail(valoresResult)) {
      return Result.fail(`Valores: ${valoresResult.error}`);
    }

    // 10. Extrair número e série da chave
    const numero = DACTeFieldExtractor.extractNumeroFromChave(chaveResult.value);
    const serie = DACTeFieldExtractor.extractSerieFromChave(chaveResult.value);

    // 11. Extrair data de emissão
    const dataEmissao = DACTeFieldExtractor.extractDataEmissao(extraction.text);

    // 12. Extrair percurso
    const percurso = DACTeFieldExtractor.extractPercurso(extraction.text);

    // 13. Montar DACTeData
    const dacte: DACTeData = {
      chaveCTe: chaveResult.value,
      numero,
      serie,
      dataEmissao,
      cfop,
      naturezaOperacao,
      modal: Result.isOk(modalResult) ? modalResult.value : 'RODOVIARIO',
      tipoServico: Result.isOk(tipoServicoResult) ? tipoServicoResult.value : 'NORMAL',
      emitente: emitenteResult.value,
      remetente: remetenteResult.value,
      destinatario: destinatarioResult.value,
      expedidor: Result.isOk(expedidorResult) ? expedidorResult.value ?? undefined : undefined,
      recebedor: Result.isOk(recebedorResult) ? recebedorResult.value ?? undefined : undefined,
      valores: valoresResult.value,
      carga: cargaResult.value,
      documentos: documentosResult.value,
      percurso,
    };

    // 14. Validar dados extraídos
    const validationResult = DACTeValidator.validate(dacte);
    if (Result.isFail(validationResult)) {
      return Result.fail(`Validação: ${validationResult.error}`);
    }

    return Result.ok(dacte);
  }

  /**
   * Extrai apenas a chave CTe do texto.
   * Método de conveniência para validação rápida.
   */
  static extractChaveCTe(text: string): Result<string, string> {
    return DACTeFieldExtractor.extractChaveCTe(text);
  }

  /**
   * Valida um DACTeData já extraído.
   */
  static validate(dacte: DACTeData): Result<void, string> {
    return DACTeValidator.validate(dacte);
  }
}
