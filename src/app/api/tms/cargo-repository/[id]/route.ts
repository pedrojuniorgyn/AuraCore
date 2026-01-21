import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cargoDocuments } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/tms/cargo-repository/[id]
 * Retorna detalhes de uma carga específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const cargoId = parseInt(resolvedParams.id);

    const [cargo] = await db
      .select()
      .from(cargoDocuments)
      .where(
        and(
          eq(cargoDocuments.id, cargoId),
          eq(cargoDocuments.organizationId, ctx.organizationId),
          isNull(cargoDocuments.deletedAt)
        )
      );

    if (!cargo) {
      return NextResponse.json(
        { error: "Carga não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: cargo });
    
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error fetching cargo:", error);
    return NextResponse.json(
      { error: "Falha ao buscar carga.", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tms/cargo-repository/[id]
 * Atualiza status ou dados de uma carga
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const cargoId = parseInt(resolvedParams.id);
    const body = await request.json();

    // Validar que a carga existe e pertence à organização
    const [existingCargo] = await db
      .select()
      .from(cargoDocuments)
      .where(
        and(
          eq(cargoDocuments.id, cargoId),
          eq(cargoDocuments.organizationId, ctx.organizationId),
          isNull(cargoDocuments.deletedAt)
        )
      );

    if (!existingCargo) {
      return NextResponse.json(
        { error: "Carga não encontrada" },
        { status: 404 }
      );
    }

    // Atualizar
    await db
      .update(cargoDocuments)
      .set({
        ...body,
        updatedBy: ctx.userId,
        updatedAt: new Date(),
        version: (existingCargo.version || 1) + 1,
      })
      .where(eq(cargoDocuments.id, cargoId));

    return NextResponse.json({
      success: true,
      message: "Carga atualizada com sucesso!",
    });
    
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error updating cargo:", error);
    return NextResponse.json(
      { error: "Falha ao atualizar carga.", details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tms/cargo-repository/[id]
 * Soft delete de uma carga
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    const cargoId = parseInt(resolvedParams.id);

    // Soft delete
    await db
      .update(cargoDocuments)
      .set({
        deletedAt: new Date(),
        updatedBy: ctx.userId,
      })
      .where(
        and(
          eq(cargoDocuments.id, cargoId),
          eq(cargoDocuments.organizationId, ctx.organizationId)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Carga removida com sucesso!",
    });
    
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Error deleting cargo:", error);
    return NextResponse.json(
      { error: "Falha ao remover carga.", details: errorMessage },
      { status: 500 }
    );
  }
}


































