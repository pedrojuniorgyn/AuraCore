/**
 * 🏦 BTG PACTUAL - SERVICE DE PIX COBRANÇA
 * 
 * Gerencia cobranças via Pix (QR Code dinâmico)
 * Documentação: https://developers.empresas.btgpactual.com/reference/post_v1-pix-cash-in-charges
 */

import { btgPost, btgGet, btgDelete } from "./btg-client";

export interface PixChargeRequest {
  valor: number;
  chavePix: string; // Chave Pix da empresa (CNPJ, email, telefone, ou aleatória)
  payerName?: string;
  payerDocument?: string;
  expiracao?: number; // Minutos até expirar (padrão: 1440 = 24h)
  descricao?: string;
}

export interface PixChargeResponse {
  txid: string;
  location: string;
  qrCode: string;
  qrCodeImage: string;
  valor: number;
  status: string;
  expiracao: string;
}

/**
 * Criar cobrança Pix
 */
export async function createBTGPixCharge(data: PixChargeRequest): Promise<PixChargeResponse> {
  try {
    console.log("💳 Criando cobrança Pix BTG...", { valor: data.valor });

    // Payload conforme documentação BTG
    const payload = {
      amount: {
        value: Math.round(data.valor * 100), // Centavos
      },
      expiration: data.expiracao || 86400, // Segundos (padrão 24h)
      payer: data.payerName && data.payerDocument ? {
        name: data.payerName,
        tax_id: data.payerDocument.replace(/\D/g, ""),
      } : undefined,
      description: data.descricao,
    };

    const response = await btgPost<Record<string, unknown>>(`/v1/pix-cash-in/charges`, payload);

    console.log("✅ Cobrança Pix BTG criada:", response.id);

    return {
      txid: String(response.id || response.txid || "generated-id"),
      location: String(response.location || ""),
      qrCode: String(response.qr_code || response.emv || ""),
      qrCodeImage: String(response.qr_code_image_url || ""),
      valor: data.valor,
      status: String(response.status || "ACTIVE"),
      expiracao: String(data.expiracao || 86400),
    };
  } catch (error) {
    console.error("❌ Erro ao criar cobrança Pix BTG:", error);
    throw error;
  }
}

/**
 * Consultar cobrança Pix
 */
export async function getBTGPixCharge(chargeId: string): Promise<PixChargeResponse> {
  try {
    console.log("🔍 Consultando cobrança Pix BTG:", chargeId);

    const response = await btgGet<Record<string, unknown>>(`/v1/pix-cash-in/charges/${chargeId}`);

    console.log("✅ Cobrança Pix consultada:", response.status);

    const amountObj = response.amount as { value?: number } | undefined;
    const valor = amountObj?.value ? amountObj.value / 100 : 0;

    return {
      txid: String(response.id || response.txid || ''),
      location: String(response.location || ''),
      qrCode: String(response.qr_code || response.emv || ''),
      qrCodeImage: String(response.qr_code_image || ''),
      valor,
      status: String(response.status || 'PENDING'),
      expiracao: String(response.expiration || response.expires_at || ''),
    };
  } catch (error) {
    console.error("❌ Erro ao consultar Pix BTG:", error);
    throw error;
  }
}

/**
 * Cancelar cobrança Pix
 */
export async function cancelBTGPixCharge(chargeId: string): Promise<void> {
  try {
    console.log("❌ Cancelando cobrança Pix BTG:", chargeId);

    await btgDelete(`/v1/pix-cash-in/charges/${chargeId}`);

    console.log("✅ Cobrança Pix BTG cancelada");
  } catch (error) {
    console.error("❌ Erro ao cancelar Pix BTG:", error);
    throw error;
  }
}

