/**
 * 🏦 BTG PACTUAL - SERVICE DE PAGAMENTOS
 * 
 * Gerencia pagamentos via Pix, TED e DOC
 * Documentação: https://developers.empresas.btgpactual.com/reference/post_v1-payments-pix
 */

import { btgPost, btgGet } from "./btg-client";

export interface PixPaymentRequest {
  beneficiaryName: string;
  beneficiaryDocument: string;
  pixKey: string;
  amount: number;
  description?: string;
}

export interface TEDPaymentRequest {
  beneficiaryName: string;
  beneficiaryDocument: string;
  bank: string; // Código do banco (ex: "001" = Banco do Brasil)
  agency: string;
  account: string;
  accountType: "checking" | "savings"; // conta corrente ou poupança
  amount: number;
  description?: string;
}

export interface PaymentResponse {
  id: string;
  status: string;
  transactionId?: string;
  message: string;
}

/**
 * Realizar pagamento via Pix
 */
export async function createBTGPixPayment(data: PixPaymentRequest): Promise<PaymentResponse> {
  try {
    console.log("💸 Realizando pagamento Pix BTG...", { valor: data.amount });

    const payload = {
      amount: {
        value: Math.round(data.amount * 100), // Centavos
      },
      pix_key: data.pixKey,
      beneficiary: {
        name: data.beneficiaryName,
        tax_id: data.beneficiaryDocument.replace(/\D/g, ""),
      },
      description: data.description || "Pagamento via AuraCore",
    };

    const response = await btgPost<any>("/v1/payments/pix", payload);

    console.log("✅ Pagamento Pix BTG realizado:", response.id);

    return {
      id: response.id,
      status: response.status,
      transactionId: response.transaction_id,
      message: "Pagamento Pix realizado com sucesso",
    };
  } catch (error) {
    console.error("❌ Erro ao realizar pagamento Pix BTG:", error);
    throw error;
  }
}

/**
 * Realizar pagamento via TED
 */
export async function createBTGTEDPayment(data: TEDPaymentRequest): Promise<PaymentResponse> {
  try {
    console.log("💸 Realizando TED BTG...", { valor: data.amount });

    const payload = {
      amount: {
        value: Math.round(data.amount * 100),
      },
      beneficiary: {
        name: data.beneficiaryName,
        tax_id: data.beneficiaryDocument.replace(/\D/g, ""),
        bank: data.bank,
        branch: data.agency,
        account: data.account,
        account_type: data.accountType,
      },
      description: data.description || "TED via AuraCore",
    };

    const response = await btgPost<any>("/v1/payments/ted", payload);

    console.log("✅ TED BTG realizado:", response.id);

    return {
      id: response.id,
      status: response.status,
      transactionId: response.transaction_id,
      message: "TED realizado com sucesso",
    };
  } catch (error) {
    console.error("❌ Erro ao realizar TED BTG:", error);
    throw error;
  }
}

/**
 * Consultar status de pagamento
 */
export async function getBTGPaymentStatus(paymentId: string): Promise<any> {
  try {
    console.log("🔍 Consultando pagamento BTG:", paymentId);

    const response = await btgGet<any>(`/v1/payments/${paymentId}`);

    console.log("✅ Pagamento consultado:", response.status);

    return {
      id: response.id,
      status: response.status,
      type: response.type,
      amount: response.amount.value / 100,
      created_at: response.created_at,
      processed_at: response.processed_at,
    };
  } catch (error) {
    console.error("❌ Erro ao consultar pagamento BTG:", error);
    throw error;
  }
}














