/**
 * API: Vehicles (Veículos)
 * GET/POST /api/fleet/vehicles
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { and, eq, isNull, desc, like } from "drizzle-orm";
import { createVehicleWithCostCenter } from "@/services/fleet/vehicle-service";
import { getTenantContext } from "@/lib/auth/context";

export async function GET(request: NextRequest) {
  try {
    // E9.3: Usar getTenantContext para multi-tenancy
    const ctx = await getTenantContext();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    // E9.3: REPO-005 + REPO-006 - Multi-tenancy completo + soft delete
    const conditions = [
      eq(vehicles.organizationId, ctx.organizationId),
      eq(vehicles.branchId, ctx.branchId), // REPO-005: branchId obrigatório
      isNull(vehicles.deletedAt),
    ];

    if (status) {
      conditions.push(eq(vehicles.status, status));
    }

    if (type) {
      conditions.push(eq(vehicles.type, type));
    }

    const vehiclesList = await db
      .select()
      .from(vehicles)
      .where(and(...conditions))
      .orderBy(desc(vehicles.createdAt));

    return NextResponse.json({ data: vehiclesList });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    console.error("❌ Erro ao listar veículos:", error);
    return NextResponse.json(
      { error: "Falha ao listar veículos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      branchId,
      plate,
      renavam,
      chassis,
      type,
      brand,
      model,
      year,
      color,
      capacityKg,
      capacityM3,
      taraKg,
      currentKm,
      notes,
    } = body;

    // === VALIDAÇÕES ===
    if (!plate || !type || !branchId) {
      return NextResponse.json(
        { error: "Campos obrigatórios: Placa, Tipo e Filial" },
        { status: 400 }
      );
    }

    // === CRIAR VEÍCULO + CENTRO DE CUSTO AUTOMÁTICO ===
    const result = await createVehicleWithCostCenter({
      organizationId,
      branchId,
      plate,
      renavam,
      chassis,
      type,
      brand,
      model,
      year,
      color,
      capacityKg,
      capacityM3,
      taraKg,
      currentKm,
      notes,
    }, "system"); // TODO: Pegar usuário logado

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Veículo criado com sucesso! Centro de Custo criado automaticamente.",
      vehicleId: result.vehicleId,
      costCenterId: result.costCenterId,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao criar veículo:", error);
    return NextResponse.json(
      { error: errorMessage || "Falha ao criar veículo" },
      { status: 500 }
    );
  }
}


