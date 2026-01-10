/**
 * API: Freight Tables (Tabelas de Frete)
 * GET/POST /api/commercial/freight-tables
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  freightTables, 
  freightTableRoutes,
  freightTablePrices,
  freightGeneralities,
  // Legacy (manter por compatibilidade)
  freightWeightRanges, 
  freightExtraComponents 
} from "@/lib/db/schema";
import { and, eq, isNull, desc } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { insertReturning } from "@/lib/db/query-helpers";

export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;

    // Buscar tabelas
    const tables = await db
      .select()
      .from(freightTables)
      .where(
        and(
          eq(freightTables.organizationId, organizationId),
          isNull(freightTables.deletedAt)
        )
      )
      .orderBy(desc(freightTables.createdAt));

    // Para cada tabela, buscar routes, prices e generalities
    const tablesWithDetails = await Promise.all(
      tables.map(async (table) => {
        // Buscar rotas
        const routes = await db
          .select()
          .from(freightTableRoutes)
          .where(
            and(
              eq(freightTableRoutes.freightTableId, table.id),
              isNull(freightTableRoutes.deletedAt)
            )
          )
          .orderBy(freightTableRoutes.displayOrder);

        // Para cada rota, buscar preços
        const routesWithPrices = await Promise.all(
          routes.map(async (route) => {
            const prices = await db
              .select()
              .from(freightTablePrices)
              .where(
                and(
                  eq(freightTablePrices.freightTableRouteId, route.id),
                  isNull(freightTablePrices.deletedAt)
                )
              )
              .orderBy(freightTablePrices.minWeight);

            return {
              ...route,
              prices,
            };
          })
        );

        // Buscar generalidades
        const generalities = await db
          .select()
          .from(freightGeneralities)
          .where(
            and(
              eq(freightGeneralities.freightTableId, table.id),
              isNull(freightGeneralities.deletedAt)
            )
          )
          .orderBy(freightGeneralities.applyOrder);

        return {
          ...table,
          routes: routesWithPrices,
          generalities,
        };
      })
    );

    return NextResponse.json({ 
      success: true,
      data: tablesWithDetails 
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao listar tabelas de frete:", error);
    return NextResponse.json(
      { error: "Falha ao listar tabelas de frete", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;
    const createdBy = ctx.userId;

    const body = await request.json();
    const {
      name,
      code,
      type,
      transportType,
      calculationType,
      customerId,
      minFreightValue,
      validFrom,
      validTo,
      status = "ACTIVE",
      description,
      routes = [],
      generalities = [],
    } = body;

    // Validações
    if (!name || !type || !transportType || !validFrom) {
      return NextResponse.json(
        { error: "Campos obrigatórios: Nome, Tipo, Tipo de Transporte e Data de Início" },
        { status: 400 }
      );
    }

    if (routes.length === 0) {
      return NextResponse.json(
        { error: "Adicione pelo menos 1 rota!" },
        { status: 400 }
      );
    }

    const tableId = await db.transaction(async (tx) => {
      // Criar tabela (SQL Server: sem .returning())
      const insertQuery = tx
        .insert(freightTables)
        .values({
          organizationId,
          name,
          code,
          type,
          transportType,
          calculationType: calculationType || "WEIGHT_RANGE",
          customerId: customerId || null,
          minFreightValue: minFreightValue || "0.00",
          validFrom: new Date(validFrom),
          validTo: validTo ? new Date(validTo) : null,
          status,
          description,
          createdBy,
        });

      const createdTableId = await insertReturning(insertQuery, { id: freightTables.id }) as Array<Record<string, unknown>>;
      const tableId = createdTableId[0]?.id;
      if (!tableId) {
        throw new Error("Falha ao criar tabela de frete");
      }

      // Criar rotas e seus preços
      for (const route of routes) {
        const insertRouteQuery = tx
          .insert(freightTableRoutes)
          .values({
            freightTableId: Number(tableId),
            originUf: route.originUf,
            destinationUf: route.destinationUf,
            originCityId: route.originCityId || null,
            destinationCityId: route.destinationCityId || null,
            notes: route.notes || null,
            displayOrder: route.displayOrder || 0,
          });

        const createdRouteId = await insertReturning(insertRouteQuery, { id: freightTableRoutes.id }) as Array<Record<string, unknown>>;
        const routeId = createdRouteId[0]?.id;

        // Criar preços para esta rota
        if (routeId && route.prices && route.prices.length > 0) {
          await tx.insert(freightTablePrices).values(
            route.prices.map((price: { minWeight?: number; maxWeight?: number; vehicleTypeId?: number; price: number; excessPrice?: number }) => ({
              freightTableRouteId: Number(routeId),
              minWeight: price.minWeight?.toString() || null,
              maxWeight: price.maxWeight?.toString() || null,
              vehicleTypeId: price.vehicleTypeId || null,
              price: price.price.toString(),
              excessPrice: price.excessPrice?.toString() || "0.00",
            }))
          );
        }
      }

      // Criar generalidades
      if (generalities.length > 0) {
        await tx.insert(freightGeneralities).values(
          generalities.map((gen: { name: string; code?: string; type: string; value: number; minValue?: number; maxValue?: number; incidence?: string; isActive?: boolean }, index: number) => ({
            freightTableId: Number(tableId),
            name: gen.name,
            code: gen.code || null,
            type: gen.type,
            value: gen.value.toString(),
            minValue: gen.minValue?.toString() || "0.00",
            maxValue: gen.maxValue?.toString() || null,
            incidence: gen.incidence || "ALWAYS",
            isActive:
              gen.isActive !== undefined ? gen.isActive.toString() : "true",
            applyOrder: index,
          }))
        );
      }

      return Number(tableId);
    });

    return NextResponse.json({
      success: true,
      message: "Tabela de frete criada com sucesso!",
      data: { id: tableId },
    });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao criar tabela de frete:", error);
    return NextResponse.json(
      { error: errorMessage || "Falha ao criar tabela de frete" },
      { status: 500 }
    );
  }
}

