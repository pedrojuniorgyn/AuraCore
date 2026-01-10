/**
 * 🏦 BTG PACTUAL - SERVICE DE BOLETOS
 * 
 * Gerencia criação, consulta e cancelamento de boletos via API BTG
 * Documentação: https://developers.empresas.btgpactual.com/reference/post_v1-pix-cash-in-billings-slips
 */

import { btgPost, btgGet, btgDelete } from "./btg-client";

export interface BoletoRequest {
  payerName: string;
  payerDocument: string;
  payerEmail?: string;
  payerPhone?: string;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  nossoNumero?: string;
  seuNumero?: string;
  descricao?: string;
  instrucoes?: string;
  valorMulta?: number;
  valorJuros?: number;
  valorDesconto?: number;
  diasDesconto?: number;
}

export interface BoletoResponse {
  id: string;
  nosso_numero: string;
  linha_digitavel: string;
  codigo_barras: string;
  pdf_url: string;
  valor: number;
  vencimento: string;
  status: string;
}

/**
 * Gerar boleto via BTG Pactual
 */
export async function generateBTGBoleto(data: BoletoRequest): Promise<BoletoResponse> {
  try {
    console.log("📄 Gerando boleto BTG...", { valor: data.valor, vencimento: data.dataVencimento });

    // Payload conforme documentação BTG
    const payload = {
      payer: {
        name: data.payerName,
        tax_id: data.payerDocument.replace(/\D/g, ""),
        email: data.payerEmail,
        phone: data.payerPhone,
      },
      amount: {
        value: Math.round(data.valor * 100), // BTG usa centavos
      },
      due_date: data.dataVencimento,
      our_number: data.nossoNumero,
      your_number: data.seuNumero,
      description: data.descricao || "Pagamento de serviços",
      instructions: data.instrucoes,
      
      // Multa e Juros
      ...(data.valorMulta && {
        fine: {
          value: Math.round(data.valorMulta * 100),
        },
      }),
      ...(data.valorJuros && {
        interest: {
          value: Math.round(data.valorJuros * 100),
        },
      }),
      ...(data.valorDesconto && data.diasDesconto && {
        discount: {
          value: Math.round(data.valorDesconto * 100),
          days: data.diasDesconto,
        },
      }),
    };

    // Chamada à API BTG
    const response = await btgPost<Record<string, unknown>>("/v1/pix-cash-in/billings/slips", payload);

    console.log("✅ Boleto BTG gerado:", response.id);

    return {
      id: response.id as string,
      nosso_numero: response.our_number as string,
      linha_digitavel: response.digitable_line as string,
      codigo_barras: response.barcode as string,
      pdf_url: response.pdf_url as string,
      valor: data.valor,
      vencimento: data.dataVencimento,
      status: response.status as string,
    };
  } catch (error) {
    console.error("❌ Erro ao gerar boleto BTG:", error);
    throw error;
  }
}

/**
 * Consultar status de boleto
 */
export async function getBTGBoletoStatus(boletoId: string): Promise<BoletoResponse> {
  try {
    console.log("🔍 Consultando boleto BTG:", boletoId);

    const response = await btgGet<Record<string, unknown>>(`/v1/pix-cash-in/billings/slips/${boletoId}`);

    console.log("✅ Boleto consultado:", response.status);

    return {
      id: response.id as string,
      nosso_numero: (response.our_number as string) || '',
      linha_digitavel: (response.digitable_line as string) || '',
      codigo_barras: (response.barcode as string) || '',
      pdf_url: (response.pdf_url as string) || '',
      valor: response.paid_amount ? (response.paid_amount as number) / 100 : 0,
      vencimento: (response.due_date as string) || '',
      status: (response.status as string) || 'PENDING',
    };
  } catch (error) {
    console.error("❌ Erro ao consultar boleto BTG:", error);
    throw error;
  }
}

/**
 * Cancelar boleto
 */
export async function cancelBTGBoleto(boletoId: string): Promise<void> {
  try {
    console.log("❌ Cancelando boleto BTG:", boletoId);

    await btgDelete(`/v1/pix-cash-in/billings/slips/${boletoId}`);

    console.log("✅ Boleto BTG cancelado");
  } catch (error) {
    console.error("❌ Erro ao cancelar boleto BTG:", error);
    throw error;
  }
}

/**
 * Download PDF do boleto
 */
export async function downloadBTGBoletoPDF(pdfUrl: string): Promise<Buffer> {
  try {
    console.log("📥 Baixando PDF do boleto BTG...");

    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      throw new Error(`Erro ao baixar PDF: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("✅ PDF do boleto baixado");

    return buffer;
  } catch (error) {
    console.error("❌ Erro ao baixar PDF do boleto:", error);
    throw error;
  }
}
































