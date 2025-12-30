import { RomaneioDocument } from '../../domain/entities/RomaneioDocument';
import { getEspecieEmbalagemDescricao } from '../../domain/value-objects/EspecieEmbalagem';

/**
 * PDF Generator: Romaneio de Carga
 * 
 * Gera PDF do romaneio conforme padrão Receita Federal.
 * 
 * Campos obrigatórios:
 * - Cabeçalho: Remetente, Destinatário, Transportador
 * - Número e Data de Emissão
 * - Tabela de Itens: Seq, Marcação, Embalagem, Qtd, Peso Líq, Peso Bruto, Dimensões, Cubagem, Descrição
 * - Totais: Volumes, Peso Líquido Total, Peso Bruto Total, Cubagem Total
 * - Documentos vinculados: CT-es, NF-es
 * - Espaço para assinatura de conferência
 * 
 * Referência: Manual de Preenchimento do Romaneio de Carga (Receita Federal)
 */
export class RomaneioPdfGenerator {
  /**
   * Gera HTML do romaneio
   * Este HTML pode ser convertido para PDF usando bibliotecas como puppeteer ou pdfkit
   */
  static generateHtml(romaneio: RomaneioDocument): string {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Romaneio de Carga - ${this.escapeHtml(romaneio.numero)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    
    .header h1 {
      font-size: 18pt;
      margin-bottom: 5px;
    }
    
    .header p {
      font-size: 12pt;
    }
    
    .info-section {
      margin-bottom: 15px;
      border: 1px solid #000;
      padding: 10px;
    }
    
    .info-section h2 {
      font-size: 12pt;
      margin-bottom: 10px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 5px;
    }
    
    .info-label {
      font-weight: bold;
      width: 150px;
    }
    
    .info-value {
      flex: 1;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 5px;
      text-align: left;
    }
    
    th {
      background-color: #f0f0f0;
      font-weight: bold;
      font-size: 9pt;
    }
    
    td {
      font-size: 9pt;
    }
    
    .number-cell {
      text-align: right;
    }
    
    .totals {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #000;
      background-color: #f9f9f9;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    
    .totals-label {
      font-weight: bold;
    }
    
    .signature-section {
      margin-top: 30px;
      page-break-inside: avoid;
    }
    
    .signature-box {
      margin-top: 50px;
      border-top: 1px solid #000;
      padding-top: 5px;
      text-align: center;
    }
    
    @media print {
      body {
        padding: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>ROMANEIO DE CARGA</h1>
    <p>Nº ${this.escapeHtml(romaneio.numero)} - ${this.formatDate(romaneio.dataEmissao)}</p>
  </div>
  
  <div class="info-section">
    <h2>Remetente</h2>
    <div class="info-row">
      <span class="info-label">ID:</span>
      <span class="info-value">${this.escapeHtml(romaneio.remetenteId)}</span>
    </div>
  </div>
  
  <div class="info-section">
    <h2>Destinatário</h2>
    <div class="info-row">
      <span class="info-label">ID:</span>
      <span class="info-value">${this.escapeHtml(romaneio.destinatarioId)}</span>
    </div>
  </div>
  
  ${romaneio.transportadorId ? `
  <div class="info-section">
    <h2>Transportador</h2>
    <div class="info-row">
      <span class="info-label">ID:</span>
      <span class="info-value">${this.escapeHtml(romaneio.transportadorId)}</span>
    </div>
  </div>
  ` : ''}
  
  ${this.renderDocumentosFiscais(romaneio)}
  
  <h2 style="margin-top: 20px; margin-bottom: 10px;">Itens do Romaneio</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30px;">Seq</th>
        <th style="width: 80px;">Marcação</th>
        <th style="width: 80px;">Embalagem</th>
        <th style="width: 40px;">Qtd</th>
        <th style="width: 70px;">Peso Líq (kg)</th>
        <th style="width: 70px;">Peso Bruto (kg)</th>
        <th style="width: 60px;">Alt (m)</th>
        <th style="width: 60px;">Larg (m)</th>
        <th style="width: 60px;">Comp (m)</th>
        <th style="width: 70px;">Cubagem (m³)</th>
        <th>Descrição</th>
      </tr>
    </thead>
    <tbody>
      ${this.renderItems(romaneio)}
    </tbody>
  </table>
  
  <div class="totals">
    <div class="totals-row">
      <span class="totals-label">Total de Volumes:</span>
      <span>${romaneio.totalVolumes}</span>
    </div>
    <div class="totals-row">
      <span class="totals-label">Peso Líquido Total:</span>
      <span>${this.formatDecimal(romaneio.pesoLiquidoTotal, 3)} kg</span>
    </div>
    <div class="totals-row">
      <span class="totals-label">Peso Bruto Total:</span>
      <span>${this.formatDecimal(romaneio.pesoBrutoTotal, 3)} kg</span>
    </div>
    <div class="totals-row">
      <span class="totals-label">Cubagem Total:</span>
      <span>${this.formatDecimal(romaneio.cubagemTotal, 6)} m³</span>
    </div>
  </div>
  
  ${this.renderConferencia(romaneio)}
  
  <div class="signature-section">
    <p><strong>Observações:</strong></p>
    <p style="min-height: 60px; border: 1px solid #ccc; padding: 10px; margin-top: 10px;">
      ${this.escapeHtml(romaneio.observacoesConferencia || '')}
    </p>
    
    <div class="signature-box">
      <p>Conferido por: _______________________________________</p>
      <p>Data: ____/____/________ Hora: ____:____</p>
    </div>
  </div>
</body>
</html>
    `;

    return html;
  }

  /**
   * Renderiza linha de item
   */
  private static renderItems(romaneio: RomaneioDocument): string {
    return romaneio.items
      .map(
        (item) => `
      <tr>
        <td class="number-cell">${item.sequencia}</td>
        <td>${this.escapeHtml(item.marcacaoVolume)}</td>
        <td>${this.escapeHtml(getEspecieEmbalagemDescricao(item.especieEmbalagem))}</td>
        <td class="number-cell">${item.quantidade}</td>
        <td class="number-cell">${this.formatDecimal(item.pesoLiquido, 3)}</td>
        <td class="number-cell">${this.formatDecimal(item.pesoBruto, 3)}</td>
        <td class="number-cell">${this.formatDecimal(item.altura, 3)}</td>
        <td class="number-cell">${this.formatDecimal(item.largura, 3)}</td>
        <td class="number-cell">${this.formatDecimal(item.comprimento, 3)}</td>
        <td class="number-cell">${this.formatDecimal(item.cubagem, 6)}</td>
        <td>${this.escapeHtml(item.descricaoProduto)}</td>
      </tr>
    `
      )
      .join('');
  }

  /**
   * Renderiza seção de documentos fiscais vinculados
   */
  private static renderDocumentosFiscais(romaneio: RomaneioDocument): string {
    if (romaneio.cteNumbers.length === 0 && romaneio.nfeNumbers.length === 0) {
      return '';
    }

    return `
    <div class="info-section">
      <h2>Documentos Fiscais Vinculados</h2>
      ${romaneio.cteNumbers.length > 0 ? `
      <div class="info-row">
        <span class="info-label">CT-es:</span>
        <span class="info-value">${this.escapeHtml(romaneio.cteNumbers.join(', '))}</span>
      </div>
      ` : ''}
      ${romaneio.nfeNumbers.length > 0 ? `
      <div class="info-row">
        <span class="info-label">NF-es:</span>
        <span class="info-value">${this.escapeHtml(romaneio.nfeNumbers.join(', '))}</span>
      </div>
      ` : ''}
    </div>
    `;
  }

  /**
   * Renderiza seção de conferência (se já conferido)
   */
  private static renderConferencia(romaneio: RomaneioDocument): string {
    if (romaneio.status !== 'DELIVERED' || !romaneio.conferidoPor) {
      return '';
    }

    return `
    <div class="info-section">
      <h2>Conferência de Entrega</h2>
      <div class="info-row">
        <span class="info-label">Conferido por:</span>
        <span class="info-value">${this.escapeHtml(romaneio.conferidoPor)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Data da Conferência:</span>
        <span class="info-value">${romaneio.dataConferencia ? this.formatDate(romaneio.dataConferencia) : ''}</span>
      </div>
    </div>
    `;
  }

  /**
   * Formata data para exibição
   */
  private static formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formata decimal com escala
   */
  private static formatDecimal(value: number, scale: number): string {
    return value.toFixed(scale);
  }

  /**
   * Escapa HTML
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}

