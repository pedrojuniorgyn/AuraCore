/**
 * 🚛 VEHICLE SERVICE
 * 
 * Lógica de negócio para veículos com automação de Centro de Custo
 */

import { db } from "@/lib/db";
import { vehicles, costCenters } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { validatePlate, normalizePlate } from "@/lib/validators/fleet-validators";

interface CreateVehicleParams {
  organizationId: number;
  branchId: number;
  plate: string;
  renavam?: string;
  chassis?: string;
  type: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  capacityKg?: number;
  capacityM3?: number;
  taraKg?: number;
  currentKm?: number;
  notes?: string;
}

/**
 * 🚀 CRIAR VEÍCULO COM AUTO-CRIAÇÃO DE CENTRO DE CUSTO
 * 
 * Regra de Negócio:
 * 1. Valida e cria o veículo
 * 2. Cria automaticamente um Centro de Custo Analítico vinculado
 * 3. Vincula ao pai "Frota Própria"
 */
export async function createVehicleWithCostCenter(
  params: CreateVehicleParams,
  createdBy: string = "system"
): Promise<{ success: boolean; vehicleId?: number; costCenterId?: number; error?: string }> {
  try {
    // === VALIDAÇÕES ===
    if (!validatePlate(params.plate)) {
      return {
        success: false,
        error: "Placa inválida. Use formato ABC-1234 ou ABC1D23 (Mercosul)",
      };
    }

    const normalizedPlate = normalizePlate(params.plate);

    // Verificar duplicidade
    const [existing] = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.plate, normalizedPlate),
          eq(vehicles.organizationId, params.organizationId),
          isNull(vehicles.deletedAt)
        )
      );

    if (existing) {
      return {
        success: false,
        error: "Placa já cadastrada para esta organização",
      };
    }

    // === 1. CRIAR VEÍCULO ===
    await db.insert(vehicles).values({
      organizationId: params.organizationId,
      branchId: params.branchId,
      plate: normalizedPlate,
      renavam: params.renavam,
      chassis: params.chassis,
      type: params.type.toUpperCase(),
      brand: params.brand,
      model: params.model,
      year: params.year,
      color: params.color,
      capacityKg: params.capacityKg?.toString() || "0",
      capacityM3: params.capacityM3?.toString() || "0",
      taraKg: params.taraKg?.toString() || "0",
      currentKm: params.currentKm || 0,
      status: "AVAILABLE",
      maintenanceStatus: "OK",
      notes: params.notes,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Buscar veículo criado
    const allVehicles = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.plate, normalizedPlate),
          eq(vehicles.organizationId, params.organizationId)
        )
      )
      .orderBy(vehicles.id);
    
    const createdVehicle = allVehicles[allVehicles.length - 1]; // Pega o último (mais recente)

    if (!createdVehicle) {
      return {
        success: false,
        error: "Erro ao buscar veículo criado",
      };
    }

    // === 2. BUSCAR ID DO CENTRO DE CUSTO PAI "FROTA PRÓPRIA" ===
    const [frotaPropriaCC] = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.code, "1.1"),
          eq(costCenters.organizationId, params.organizationId),
          isNull(costCenters.deletedAt)
        )
      );

    const parentCCId = frotaPropriaCC?.id || null;

    // === 3. AUTO-CRIAR CENTRO DE CUSTO ANALÍTICO ===
    const ccCode = `1.1.${normalizedPlate}`;
    const ccName = params.model 
      ? `Veículo ${params.model} - ${normalizedPlate}`
      : `Veículo ${normalizedPlate}`;

    await db.insert(costCenters).values({
      organizationId: params.organizationId,
      code: ccCode,
      name: ccName,
      description: `Centro de custo automático para veículo ${normalizedPlate}`,
      type: "ANALYTIC",
      parentId: parentCCId,
      level: 2,
      isAnalytical: "true",
      linkedVehicleId: createdVehicle.id,
      status: "ACTIVE",
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Buscar CC criado
    const [createdCC] = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.code, ccCode),
          eq(costCenters.organizationId, params.organizationId)
        )
      );

    console.log(`✅ Veículo ${normalizedPlate} criado com Centro de Custo ${ccCode}`);

    return {
      success: true,
      vehicleId: createdVehicle.id,
      costCenterId: createdCC?.id,
    };
  } catch (error: unknown) {
    console.error("❌ Erro ao criar veículo:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage || "Falha ao criar veículo",
    };
  }
}

