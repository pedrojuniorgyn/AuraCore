/**
 * IDacteGenerator - Port para geração de PDF do DACTE
 *
 * Interface para adapters que geram o PDF físico do DACTE.
 * O Domain Service (DacteGeneratorService) gera a estrutura de dados,
 * este port define a interface para gerar o arquivo PDF.
 *
 * Implementações:
 * - PdfKitDacteAdapter: Usa pdfkit para gerar PDF
 * - PuppeteerDacteAdapter: Usa HTML + Puppeteer
 * - MockDacteAdapter: Para testes (retorna buffer vazio)
 *
 * @module fiscal/domain/ports/output
 * @since E8 Fase 2.3
 */

import { Result } from '@/shared/domain';
import type { DacteData } from '../../services/DacteGeneratorService';

/**
 * IDacteGenerator
 *
 * Port para geração de PDF do DACTE a partir da estrutura de dados.
 */
export interface IDacteGenerator {
  /**
   * Gera PDF do DACTE a partir dos dados estruturados
   *
   * @param data Estrutura de dados do DACTE (do DacteGeneratorService)
   * @returns Result com Buffer do PDF ou erro
   */
  generatePdf(data: DacteData): Promise<Result<Buffer, string>>;

  /**
   * Gera PDF do DACTE em formato base64
   *
   * @param data Estrutura de dados do DACTE
   * @returns Result com string base64 do PDF ou erro
   */
  generatePdfBase64(data: DacteData): Promise<Result<string, string>>;
}
