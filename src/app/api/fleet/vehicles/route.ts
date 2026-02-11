/**
 * API: Vehicles (Veículos)
 * GET/POST /api/fleet/vehicles
 * 
 * @since E9 Fase 2 - Migrado para IVehicleServiceGateway via DI
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { container } from "@/shared/infrastructure/di/container";
import { FLEET_TOKENS } from "@/modules/fleet/infrastructure/di/FleetModule";
import type { IVehicleServiceGateway } from "@/modules/fleet/domain/ports/output/IVehicleServiceGateway";
import { Result } from "@/shared/domain";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const GET = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const type = searchParams.get("type");

    const conditions = [
      eq(vehicles.organizationId, ctx.organizationId),
      eq(vehicles.branchId, ctx.branchId),
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
    logger.error("❌ Erro ao listar veículos:", error);
    return NextResponse.json(
      { error: "Falha ao listar veículos" },
      { status: 500 }
    );
  }
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const ctx = await getTenantContext();
    const body = await request.json();
    const {
      plate,
      type,
      brand,
      model,
      year,
      capacityKg,
    } = body;

    // === VALIDAÇÕES ===
    if (!plate || !type) {
      return NextResponse.json(
        { error: "Campos obrigatórios: Placa e Tipo" },
        { status: 400 }
      );
    }

    // === CRIAR VEÍCULO VIA GATEWAY ===
    const vehicleGateway = container.resolve<IVehicleServiceGateway>(
      FLEET_TOKENS.VehicleServiceGateway
    );

    const result = await vehicleGateway.createWithCostCenter({
      organizationId: ctx.organizationId,
      branchId: ctx.branchId,
      plate,
      model: model || '',
      brand: brand || '',
      year: year || new Date().getFullYear(),
      vehicleType: type,
      capacity: capacityKg || 0,
      createCostCenter: true,
      createdBy: ctx.userId,
    });

    if (Result.isFail(result)) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Veículo criado com sucesso! Centro de Custo criado automaticamente.",
      vehicleId: result.value.vehicleId,
      costCenterId: result.value.costCenterId,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao criar veículo:", error);
    return NextResponse.json(
      { error: errorMessage || "Falha ao criar veículo" },
      { status: 500 }
    );
  }
});
