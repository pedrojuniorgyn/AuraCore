import { Result } from '@/shared/domain';
import type { FiscalDocument } from '../../entities/FiscalDocument';

/**
 * Port: IFiscalDocumentPdfGenerator
 * 
 * Interface para geração de PDFs de documentos fiscais (DANFE, DACTE, etc).
 * 
 * Implementações:
 * - MockPdfGenerator: Para testes/desenvolvimento (retorna placeholder)
 * - RealPdfGenerator: Para produção (gera PDF real com layout oficial)
 * 
 * Padrão: Hexagonal Architecture (Port)
 */
export interface IFiscalDocumentPdfGenerator {
  /**
   * Gera DANFE (Documento Auxiliar da Nota Fiscal Eletrônica)
   * 
   * @param document Documento fiscal do tipo NFE
   * @returns Buffer com PDF gerado
   */
  generateDanfe(document: FiscalDocument): Promise<Result<Buffer, string>>;

  /**
   * Gera DACTE (Documento Auxiliar do Conhecimento de Transporte Eletrônico)
   * 
   * @param document Documento fiscal do tipo CTE
   * @returns Buffer com PDF gerado
   */
  generateDacte(document: FiscalDocument): Promise<Result<Buffer, string>>;

  /**
   * Gera DAMDFE (Documento Auxiliar do Manifesto de Documentos Fiscais Eletrônicos)
   * 
   * @param document Documento fiscal do tipo MDFE
   * @returns Buffer com PDF gerado
   */
  generateDamdfe(document: FiscalDocument): Promise<Result<Buffer, string>>;

  /**
   * Gera documento auxiliar de NFS-e
   * 
   * @param document Documento fiscal do tipo NFSE
   * @returns Buffer com PDF gerado
   */
  generateNfseDocument(document: FiscalDocument): Promise<Result<Buffer, string>>;
}

