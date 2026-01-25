import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { queryFirst } from "@/lib/db/query-helpers";
import { updateTripSchema } from "@/lib/validation/tms-schemas";
import { idParamSchema } from "@/lib/validation/common-schemas";

// GET - Buscar viagem específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // ✅ S1.1 Batch 3 Phase 2: Validar ID com Zod
    const validation = idParamSchema.safeParse(resolvedParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "ID inválido",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const tripId = validation.data.id;

    const trip = await queryFirst<typeof trips.$inferSelect>(
      db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.id, tripId),
            eq(trips.organizationId, session.user.organizationId),
            isNull(trips.deletedAt)
          )
        )
        .orderBy(asc(trips.id))
    );

    if (!trip) {
      return NextResponse.json(
        { error: "Viagem não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: trip });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao buscar viagem:", error);
    return NextResponse.json(
      { error: "Erro ao buscar viagem" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar viagem
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // ✅ S1.1 Batch 3 Phase 2: Validar ID com Zod
    const idValidation = idParamSchema.safeParse(resolvedParams);
    if (!idValidation.success) {
      return NextResponse.json(
        {
          error: "ID inválido",
          details: idValidation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const tripId = idValidation.data.id;

    const body = await req.json();
    
    // ✅ S1.1 Batch 3 Phase 2: Validar body com Zod
    const validation = updateTripSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Dados inválidos",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Evitar override de campos sensíveis via spread
    const {
      organizationId: _orgId,
      branchId: _branchId,
      tripNumber: _tripNumber,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      deletedAt: _deletedAt,
      deletedBy: _deletedBy,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    // Verificar se viagem existe
    const existing = await queryFirst<typeof trips.$inferSelect>(
      db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.id, tripId),
            eq(trips.organizationId, session.user.organizationId),
            isNull(trips.deletedAt)
          )
        )
        .orderBy(asc(trips.id))
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Viagem não encontrada" },
        { status: 404 }
      );
    }

    // Validar mudança de status
    if (body.status === "COMPLETED" && existing.status !== "IN_TRANSIT") {
      return NextResponse.json(
        { error: "Apenas viagens em trânsito podem ser concluídas" },
        { status: 400 }
      );
    }

    if (body.status === "CANCELED" && existing.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Não é possível cancelar viagem já concluída" },
        { status: 400 }
      );
    }

    // Atualizar
    await db
      .update(trips)
      .set({
        ...safeBody,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(trips.id, tripId),
          eq(trips.organizationId, session.user.organizationId),
          isNull(trips.deletedAt)
        )
      );

    const updated = await queryFirst<typeof trips.$inferSelect>(
      db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.id, tripId),
            eq(trips.organizationId, session.user.organizationId),
            isNull(trips.deletedAt)
          )
        )
        .orderBy(asc(trips.id))
    );

    return NextResponse.json({
      success: true,
      message: "Viagem atualizada com sucesso",
      data: updated,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao atualizar viagem:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar viagem" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da viagem
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const tripId = parseInt(resolvedParams.id);
    if (isNaN(tripId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se viagem existe
    const existing = await queryFirst<typeof trips.$inferSelect>(
      db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.id, tripId),
            eq(trips.organizationId, session.user.organizationId),
            isNull(trips.deletedAt)
          )
        )
        .orderBy(asc(trips.id))
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Viagem não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing.status === "IN_TRANSIT") {
      return NextResponse.json(
        { error: "Não é possível excluir viagem em trânsito" },
        { status: 400 }
      );
    }

    if (existing.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Não é possível excluir viagem já concluída" },
        { status: 400 }
      );
    }

    // TODO: Validar se existem CTes vinculados
    // const linkedCtes = await checkLinkedCtes(tripId);
    // if (linkedCtes) {
    //   return NextResponse.json(
    //     { error: "Existem CTes vinculados a esta viagem" },
    //     { status: 400 }
    //   );
    // }

    // Soft delete
    await db
      .update(trips)
      .set({
        deletedAt: new Date(),
      })
      .where(and(eq(trips.id, tripId), eq(trips.organizationId, session.user.organizationId), isNull(trips.deletedAt)));

    return NextResponse.json({
      success: true,
      message: "Viagem excluída com sucesso",
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao excluir viagem:", error);
    return NextResponse.json(
      { error: "Erro ao excluir viagem" },
      { status: 500 }
    );
  }
}









