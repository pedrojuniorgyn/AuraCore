import { Receipt } from '../../domain/entities/receipt/Receipt';

/**
 * Gerador de PDF de Recibo
 * 
 * REGRA IMPORTANTE:
 * - TODOS os valores devem ser escapados para prevenir XSS
 * - Mesmo UUIDs devem ser escapados (segurança defensiva)
 */

/**
 * Escapa HTML
 */
function escapeHtml(text: string | undefined | null): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formata data para exibição
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Formata data e hora para exibição
 */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formata valor monetário
 */
function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Gera HTML do recibo
 */
export function generateReceiptHtml(receipt: Receipt): string {
  // Escapar TODOS os valores
  const id = escapeHtml(receipt.id);
  const numeroCompleto = escapeHtml(receipt.getNumeroCompleto());
  const tipo = escapeHtml(receipt.tipo);
  
  const pagadorNome = escapeHtml(receipt.pagador.nome);
  const pagadorDocumento = escapeHtml(receipt.pagador.formatDocumento());
  const pagadorEndereco = escapeHtml(receipt.pagador.formatEndereco());
  
  const recebedorNome = escapeHtml(receipt.recebedor.nome);
  const recebedorDocumento = escapeHtml(receipt.recebedor.formatDocumento());
  const recebedorEndereco = escapeHtml(receipt.recebedor.formatEndereco());
  
  const valor = formatMoney(receipt.valor.amount, receipt.valor.currency);
  const valorPorExtenso = escapeHtml(receipt.valorPorExtenso);
  
  const descricao = escapeHtml(receipt.descricao);
  const formaPagamento = escapeHtml(receipt.formaPagamento);
  const dataRecebimento = formatDate(receipt.dataRecebimento);
  const localRecebimento = escapeHtml(receipt.localRecebimento);
  
  const emitidoPor = escapeHtml(receipt.emitidoPor);
  const emitidoEm = formatDateTime(receipt.emitidoEm);
  
  const status = receipt.status;
  const canceladoEm = receipt.canceladoEm ? formatDateTime(receipt.canceladoEm) : '';
  const canceladoPor = escapeHtml(receipt.canceladoPor);
  const motivoCancelamento = escapeHtml(receipt.motivoCancelamento);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo ${numeroCompleto}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      padding: 40px; 
      background: #fff;
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      border: 2px solid #333;
      padding: 30px;
    }
    .header { 
      text-align: center; 
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .header h1 { 
      font-size: 28px; 
      margin-bottom: 10px;
    }
    .header .numero { 
      font-size: 18px; 
      color: #666;
    }
    .section { 
      margin-bottom: 25px;
    }
    .section h2 { 
      font-size: 16px; 
      margin-bottom: 10px;
      color: #333;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    .field { 
      margin-bottom: 8px;
      font-size: 14px;
    }
    .field label { 
      font-weight: bold; 
      display: inline-block;
      width: 150px;
    }
    .field value { 
      color: #333;
    }
    .valor-destaque { 
      background: #f0f0f0;
      padding: 15px;
      margin: 20px 0;
      border: 1px solid #ccc;
      text-align: center;
    }
    .valor-destaque .amount { 
      font-size: 24px; 
      font-weight: bold;
      color: #000;
    }
    .valor-destaque .extenso { 
      font-size: 14px; 
      margin-top: 10px;
      font-style: italic;
      color: #666;
    }
    .footer { 
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    .assinatura {
      margin-top: 50px;
      text-align: center;
    }
    .assinatura .linha {
      border-top: 1px solid #333;
      width: 300px;
      margin: 0 auto 10px;
    }
    .cancelled {
      color: red;
      font-weight: bold;
      text-align: center;
      padding: 20px;
      border: 3px solid red;
      margin: 20px 0;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>RECIBO</h1>
      <div class="numero">Nº ${numeroCompleto}</div>
      <div class="numero">Tipo: ${tipo}</div>
    </div>

    ${status === 'CANCELLED' ? `
    <div class="cancelled">
      ⚠️ RECIBO CANCELADO ⚠️
      <br>
      ${canceladoEm ? `Data: ${canceladoEm}` : ''}
      <br>
      ${canceladoPor ? `Por: ${canceladoPor}` : ''}
      <br>
      ${motivoCancelamento ? `Motivo: ${motivoCancelamento}` : ''}
    </div>
    ` : ''}

    <div class="section">
      <h2>Pagador</h2>
      <div class="field">
        <label>Nome:</label>
        <value>${pagadorNome}</value>
      </div>
      <div class="field">
        <label>Documento:</label>
        <value>${pagadorDocumento}</value>
      </div>
      ${pagadorEndereco ? `
      <div class="field">
        <label>Endereço:</label>
        <value>${pagadorEndereco}</value>
      </div>
      ` : ''}
    </div>

    <div class="section">
      <h2>Recebedor</h2>
      <div class="field">
        <label>Nome:</label>
        <value>${recebedorNome}</value>
      </div>
      <div class="field">
        <label>Documento:</label>
        <value>${recebedorDocumento}</value>
      </div>
      ${recebedorEndereco ? `
      <div class="field">
        <label>Endereço:</label>
        <value>${recebedorEndereco}</value>
      </div>
      ` : ''}
    </div>

    <div class="valor-destaque">
      <div class="amount">${valor}</div>
      <div class="extenso">(${valorPorExtenso})</div>
    </div>

    <div class="section">
      <h2>Detalhes do Pagamento</h2>
      <div class="field">
        <label>Descrição:</label>
        <value>${descricao}</value>
      </div>
      <div class="field">
        <label>Forma de Pagamento:</label>
        <value>${formaPagamento}</value>
      </div>
      <div class="field">
        <label>Data Recebimento:</label>
        <value>${dataRecebimento}</value>
      </div>
      ${localRecebimento ? `
      <div class="field">
        <label>Local Recebimento:</label>
        <value>${localRecebimento}</value>
      </div>
      ` : ''}
    </div>

    <div class="assinatura">
      <div class="linha"></div>
      <div>${recebedorNome}</div>
      <div style="font-size: 12px; color: #666;">Assinatura do Recebedor</div>
    </div>

    <div class="footer">
      <div>Emitido por: ${emitidoPor}</div>
      <div>Data de Emissão: ${emitidoEm}</div>
      <div>ID: ${id}</div>
      <div style="margin-top: 10px;">
        Este recibo tem validade apenas como comprovante de pagamento/recebimento.
        <br>
        Lei 8.846/94 - Obrigatoriedade de emissão de comprovante.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Classe utilitária para geração de PDF
 */
export class ReceiptPdfGenerator {
  /**
   * Gera HTML do recibo
   */
  generateHtml(receipt: Receipt): string {
    return generateReceiptHtml(receipt);
  }

  /**
   * Gera buffer PDF (implementação futura com biblioteca PDF)
   * 
   * Por enquanto retorna HTML como string.
   * Na produção, usar biblioteca como puppeteer ou pdfkit.
   */
  async generate(receipt: Receipt): Promise<Buffer> {
    const html = this.generateHtml(receipt);
    return Buffer.from(html, 'utf-8');
  }
}

