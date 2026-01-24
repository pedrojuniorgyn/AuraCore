import { injectable } from 'tsyringe';
import { Result } from '@/shared/domain';
import type { IFiscalDocumentPdfGenerator } from '../../domain/ports/output/IFiscalDocumentPdfGenerator';
import type { FiscalDocument } from '../../domain/entities/FiscalDocument';
import type { DocumentType } from '../../domain/value-objects/DocumentType';

/**
 * MockPdfGenerator
 * 
 * Implementação simulada do gerador de PDF para desenvolvimento e testes.
 * Retorna PDF placeholder ao invés de gerar PDF real.
 * 
 * Características:
 * - Retorna Buffer com PDF básico (placeholder)
 * - Inclui informações do documento no PDF
 * - Delay simulado (200-500ms)
 * - Estrutura preparada para implementação real
 * 
 * ⚠️ NÃO USAR EM PRODUÇÃO!
 * Para produção, implementar RealPdfGenerator com:
 * - Biblioteca PDF (pdfkit, pdfmake, puppeteer)
 * - Layout oficial SEFAZ
 * - QR Code da chave fiscal
 * - Código de barras
 */
@injectable()
export class MockPdfGenerator implements IFiscalDocumentPdfGenerator {
  private readonly DELAY_MIN_MS = 200;
  private readonly DELAY_MAX_MS = 500;

  /**
   * Simula delay de geração de PDF
   */
  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * (this.DELAY_MAX_MS - this.DELAY_MIN_MS) + this.DELAY_MIN_MS;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Gera PDF placeholder com informações básicas
   */
  private generatePlaceholderPdf(document: FiscalDocument, title: string): Buffer {
    const content = `
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 595 842]
/Contents 4 0 R
/Resources <<
  /Font <<
    /F1 <<
      /Type /Font
      /Subtype /Type1
      /BaseFont /Helvetica
    >>
  >>
>>
>>
endobj
4 0 obj
<<
/Length 500
>>
stream
BT
/F1 24 Tf
50 800 Td
(${title} - PLACEHOLDER) Tj
ET
BT
/F1 12 Tf
50 750 Td
(Este e um PDF placeholder gerado pelo MockPdfGenerator) Tj
ET
BT
/F1 10 Tf
50 720 Td
(Documento ID: ${document.id}) Tj
0 -15 Td
(Tipo: ${document.documentType}) Tj
0 -15 Td
(Serie: ${document.series} | Numero: ${document.number}) Tj
0 -15 Td
(Chave Fiscal: ${document.fiscalKey?.value || 'N/A'}) Tj
0 -15 Td
(Total: R$ ${document.totalDocument.amount.toFixed(2)}) Tj
0 -15 Td
(Itens: ${document.items.length}) Tj
0 -30 Td
(Para producao, implementar RealPdfGenerator com:) Tj
0 -15 Td
(- Layout oficial SEFAZ) Tj
0 -15 Td
(- QR Code da chave fiscal) Tj
0 -15 Td
(- Codigo de barras) Tj
0 -15 Td
(- Biblioteca PDF profissional) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000315 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
867
%%EOF
`;

    return Buffer.from(content, 'utf-8');
  }

  /**
   * Gera DANFE (Documento Auxiliar da Nota Fiscal Eletrônica) - PLACEHOLDER
   */
  async generateDanfe(document: FiscalDocument): Promise<Result<Buffer, string>> {
    await this.simulateDelay();

    // Validar tipo de documento
    if (document.documentType !== 'NFE') {
      return Result.fail(`Documento não é NFE. Tipo: ${document.documentType}`);
    }

    // Validar que tem itens
    if (document.items.length === 0) {
      return Result.fail('Documento sem itens não pode gerar DANFE');
    }

    const pdf = this.generatePlaceholderPdf(document, 'DANFE');
    return Result.ok(pdf);
  }

  /**
   * Gera DACTE (Documento Auxiliar do Conhecimento de Transporte Eletrônico) - PLACEHOLDER
   */
  async generateDacte(document: FiscalDocument): Promise<Result<Buffer, string>> {
    await this.simulateDelay();

    // Validar tipo de documento
    if (document.documentType !== 'CTE') {
      return Result.fail(`Documento não é CTE. Tipo: ${document.documentType}`);
    }

    const pdf = this.generatePlaceholderPdf(document, 'DACTE');
    return Result.ok(pdf);
  }

  /**
   * Gera DAMDFE (Documento Auxiliar do Manifesto de Documentos Fiscais Eletrônicos) - PLACEHOLDER
   */
  async generateDamdfe(document: FiscalDocument): Promise<Result<Buffer, string>> {
    await this.simulateDelay();

    // Validar tipo de documento
    if (document.documentType !== 'MDFE') {
      return Result.fail(`Documento não é MDFE. Tipo: ${document.documentType}`);
    }

    const pdf = this.generatePlaceholderPdf(document, 'DAMDFE');
    return Result.ok(pdf);
  }

  /**
   * Gera documento auxiliar de NFS-e - PLACEHOLDER
   */
  async generateNfseDocument(document: FiscalDocument): Promise<Result<Buffer, string>> {
    await this.simulateDelay();

    // Validar tipo de documento
    if (document.documentType !== 'NFSE') {
      return Result.fail(`Documento não é NFSE. Tipo: ${document.documentType}`);
    }

    const pdf = this.generatePlaceholderPdf(document, 'NFS-e');
    return Result.ok(pdf);
  }
}

