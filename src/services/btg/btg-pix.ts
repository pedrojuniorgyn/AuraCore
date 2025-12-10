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

    const response = await btgPost<any>(`/v1/pix-cash-in/charges`, payload);

    console.log("✅ Cobrança Pix BTG criada:", response.id);

    return {
      txid: response.id || response.txid || "generated-id",
      location: response.location || "",
      qrCode: response.qr_code || response.emv || "",
      qrCodeImage: response.qr_code_image_url || "",
      valor: data.valor,
      status: response.status || "ACTIVE",
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
export async function getBTGPixCharge(chargeId: string): Promise<any> {
  try {
    console.log("🔍 Consultando cobrança Pix BTG:", chargeId);

    const response = await btgGet<any>(`/v1/pix-cash-in/charges/${chargeId}`);

    console.log("✅ Cobrança Pix consultada:", response.status);

    return {
      txid: response.id || response.txid,
      status: response.status,
      valor: response.amount ? response.amount.value / 100 : 0,
      valor_pago: response.paid_amount ? response.paid_amount / 100 : 0,
      data_pagamento: response.paid_at,
      qrCode: response.qr_code || response.emv,
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

