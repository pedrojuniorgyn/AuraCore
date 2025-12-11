/**
 * API: Freight Table Detail
 * GET/PUT/DELETE /api/commercial/freight-tables/:id
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { freightTables, freightWeightRanges, freightExtraComponents } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const tableId = Number(resolvedParams.id);

    // Buscar tabela
    const [table] = await db
      .select()
      .from(freightTables)
      .where(
        and(
          eq(freightTables.id, tableId),
          isNull(freightTables.deletedAt)
        )
      );

    if (!table) {
      return NextResponse.json(
        { error: "Tabela não encontrada" },
        { status: 404 }
      );
    }

    // Buscar ranges
    const ranges = await db
      .select()
      .from(freightWeightRanges)
      .where(
        and(
          eq(freightWeightRanges.freightTableId, tableId),
          isNull(freightWeightRanges.deletedAt)
        )
      )
      .orderBy(freightWeightRanges.minWeight);

    // Buscar components
    const components = await db
      .select()
      .from(freightExtraComponents)
      .where(
        and(
          eq(freightExtraComponents.freightTableId, tableId),
          isNull(freightExtraComponents.deletedAt)
        )
      )
      .orderBy(freightExtraComponents.applyOrder);

    return NextResponse.json({
      data: {
        ...table,
        ranges,
        components,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar tabela:", error);
    return NextResponse.json(
      { error: "Falha ao buscar tabela" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const tableId = Number(resolvedParams.id);
    const body = await request.json();

    const {
      name,
      code,
      type,
      transportType,
      customerId,
      validFrom,
      validTo,
      status,
      description,
      ranges,
      components,
    } = body;

    // Atualizar tabela
    await db
      .update(freightTables)
      .set({
        name,
        code,
        type,
        transportType,
        customerId: customerId || null,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validTo: validTo ? new Date(validTo) : null,
        status,
        description,
        updatedBy: "system",
        updatedAt: new Date(),
      })
      .where(eq(freightTables.id, tableId));

    // Se forneceu ranges, atualizar (deletar antigas e criar novas)
    if (ranges) {
      // Soft delete antigas
      await db
        .update(freightWeightRanges)
        .set({ deletedAt: new Date() })
        .where(eq(freightWeightRanges.freightTableId, tableId));

      // Criar novas
      if (ranges.length > 0) {
        await db.insert(freightWeightRanges).values(
          ranges.map((range: any, index: number) => ({
            freightTableId: tableId,
            minWeight: range.minWeight,
            maxWeight: range.maxWeight || null,
            fixedPrice: range.fixedPrice,
            pricePerKgExceeded: range.pricePerKgExceeded || "0.00",
            displayOrder: index,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
      }
    }

    // Se forneceu components, atualizar
    if (components) {
      // Soft delete antigas
      await db
        .update(freightExtraComponents)
        .set({ deletedAt: new Date() })
        .where(eq(freightExtraComponents.freightTableId, tableId));

      // Criar novas
      if (components.length > 0) {
        await db.insert(freightExtraComponents).values(
          components.map((comp: any, index: number) => ({
            freightTableId: tableId,
            name: comp.name,
            code: comp.code || null,
            type: comp.type,
            value: comp.value,
            minValue: comp.minValue || "0.00",
            maxValue: comp.maxValue || null,
            isActive: comp.isActive || "true",
            applyOrder: index,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tabela atualizada com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Erro ao atualizar tabela:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao atualizar tabela" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const tableId = Number(resolvedParams.id);

    // Soft delete
    await db
      .update(freightTables)
      .set({ deletedAt: new Date() })
      .where(eq(freightTables.id, tableId));

    return NextResponse.json({
      success: true,
      message: "Tabela excluída com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro ao excluir tabela:", error);
    return NextResponse.json(
      { error: "Falha ao excluir tabela" },
      { status: 500 }
    );
  }
}









