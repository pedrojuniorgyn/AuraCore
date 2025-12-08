/**
 * CIOT VALIDATOR SERVICE
 * 
 * Valida CIOT (Código Identificador da Operação de Transporte)
 * Obrigatório para motoristas terceiros/agregados
 */

import { db } from "@/lib/db";
import { trips, drivers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface CiotValidationParams {
  tripId: number;
  driverType: string;
  ciotNumber?: string | null;
}

export interface CiotValidationResult {
  valid: boolean;
  required: boolean;
  message?: string;
}

/**
 * Valida se CIOT é necessário e está presente
 */
export async function validateCiot(
  params: CiotValidationParams
): Promise<CiotValidationResult> {
  const { driverType, ciotNumber } = params;

  // CIOT obrigatório apenas para terceiros e agregados
  const requiresCiot = ["THIRD_PARTY", "AGGREGATE"].includes(driverType);

  if (!requiresCiot) {
    return {
      valid: true,
      required: false,
      message: "CIOT não obrigatório para frota própria",
    };
  }

  // Se obrigatório, verificar se foi informado
  if (!ciotNumber || ciotNumber.trim() === "") {
    return {
      valid: false,
      required: true,
      message: "CIOT obrigatório para motoristas terceiros/agregados!",
    };
  }

  // Validar formato (15 dígitos)
  if (!/^\d{15}$/.test(ciotNumber)) {
    return {
      valid: false,
      required: true,
      message: "CIOT inválido! Deve ter 15 dígitos numéricos.",
    };
  }

  return {
    valid: true,
    required: true,
    message: "CIOT válido",
  };
}

/**
 * Valida CIOT antes de criar/atualizar viagem
 */
export async function validateTripCiot(tripId: number): Promise<void> {
  const [trip] = await db
    .select()
    .from(trips)
    .where(eq(trips.id, tripId));

  if (!trip) {
    throw new Error(`Viagem #${tripId} não encontrada`);
  }

  const validation = await validateCiot({
    tripId,
    driverType: trip.driverType || "OWN",
    ciotNumber: trip.ciotNumber,
  });

  if (!validation.valid) {
    throw new Error(validation.message);
  }
}

/**
 * Marca viagem como "requer CIOT" baseado no tipo de motorista
 */
export function shouldRequireCiot(driverType: string): boolean {
  return ["THIRD_PARTY", "AGGREGATE"].includes(driverType);
}

