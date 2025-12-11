/**
 * INSURANCE VALIDATOR SERVICE
 * 
 * Valida Averbação de Seguro
 * Obrigatório antes de emitir CTe
 */

import { db } from "@/lib/db";
import { cteHeader, pickupOrders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface InsuranceValidationParams {
  insurancePolicy?: string | null;
  insuranceCertificate?: string | null;
  insuranceCompany?: string | null;
}

export interface InsuranceValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Valida se averbação de seguro está completa
 */
export function validateInsurance(
  params: InsuranceValidationParams
): InsuranceValidationResult {
  const { insurancePolicy, insuranceCertificate, insuranceCompany } = params;

  // Campos obrigatórios
  if (!insurancePolicy || insurancePolicy.trim() === "") {
    return {
      valid: false,
      message: "Número da apólice de seguro é obrigatório!",
    };
  }

  if (!insuranceCertificate || insuranceCertificate.trim() === "") {
    return {
      valid: false,
      message: "Número da averbação é obrigatório!",
    };
  }

  // Validar formato da apólice (aceita alfanumérico)
  if (insurancePolicy.length < 5) {
    return {
      valid: false,
      message: "Número da apólice inválido (mínimo 5 caracteres)",
    };
  }

  // Validar formato da averbação (aceita alfanumérico)
  if (insuranceCertificate.length < 5) {
    return {
      valid: false,
      message: "Número da averbação inválido (mínimo 5 caracteres)",
    };
  }

  return {
    valid: true,
    message: "Averbação de seguro válida",
  };
}

/**
 * Valida averbação antes de emitir CTe
 */
export async function validateCteInsurance(cteId: number): Promise<void> {
  const [cte] = await db
    .select()
    .from(cteHeader)
    .where(eq(cteHeader.id, cteId));

  if (!cte) {
    throw new Error(`CTe #${cteId} não encontrado`);
  }

  const validation = validateInsurance({
    insurancePolicy: cte.insurancePolicy,
    insuranceCertificate: cte.insuranceCertificate,
    insuranceCompany: cte.insuranceCompany,
  });

  if (!validation.valid) {
    throw new Error(validation.message);
  }
}

/**
 * Valida averbação na Ordem de Coleta antes de gerar CTe
 */
export async function validatePickupOrderInsurance(orderId: number): Promise<void> {
  const [order] = await db
    .select()
    .from(pickupOrders)
    .where(eq(pickupOrders.id, orderId));

  if (!order) {
    throw new Error(`Ordem de Coleta #${orderId} não encontrada`);
  }

  const validation = validateInsurance({
    insurancePolicy: order.insurancePolicy,
    insuranceCertificate: order.insuranceCertificate,
    insuranceCompany: order.insuranceCompany,
  });

  if (!validation.valid) {
    throw new Error(
      `Não é possível gerar CTe: ${validation.message}\n\nAtualize a Ordem de Coleta #${order.orderNumber} com os dados do seguro.`
    );
  }
}











