/**
 * API Routes: /api/tms/occurrences/[id]
 * 
 * ⚠️ S1.1 Batch 3 Phase 2: Zod validation added
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tripOccurrences } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { queryFirst } from "@/lib/db/query-helpers";

// ✅ S1.1 Batch 3 Phase 2: Schemas
const idParamSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)).refine((val) => !isNaN(val) && val > 0, { message: 'ID inválido' }),
});

const updateOccurrenceSchema = z.object({
  tripId: z.number().int().positive('ID da viagem inválido'),
  occurrenceType: z.string().min(1, 'Tipo de ocorrência obrigatório'),
  title: z.string().min(1, 'Título obrigatório').max(200),
  description: z.string().max(1000).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  resolvedAt: z.string().datetime().optional(),
  notes: z.string().max(1000).optional(),
});

// GET - Buscar ocorrência específica
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

    // ✅ S1.1 Batch 3 Phase 2: Validate ID with Zod
    const validation = idParamSchema.safeParse(resolvedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: "ID inválido", details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const occurrenceId = validation.data.id;

    const occurrence = await queryFirst<typeof tripOccurrences.$inferSelect>(db
      .select()
      .from(tripOccurrences)
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      )
      );

    if (!occurrence) {
      return NextResponse.json(
        { error: "Ocorrência não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: occurrence });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao buscar ocorrência:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ocorrência" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar ocorrência
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

    // ✅ S1.1 Batch 3 Phase 2: Validate ID with Zod
    const idValidation = idParamSchema.safeParse(resolvedParams);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: "ID inválido", details: idValidation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const occurrenceId = idValidation.data.id;

    const body = await req.json();
    
    // ✅ S1.1 Batch 3 Phase 2: Validate body with Zod
    const bodyValidation = updateOccurrenceSchema.safeParse(body);
    if (!bodyValidation.success) {
      return NextResponse.json(
        { error: "Dados inválidos", details: bodyValidation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const data = bodyValidation.data;
    
    // Evitar override de campos sensíveis via spread
    const {
      organizationId: _orgId,
      branchId: _branchId,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      deletedAt: _deletedAt,
      deletedBy: _deletedBy,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    // Verificar se ocorrência existe
    const existing = await queryFirst<typeof tripOccurrences.$inferSelect>(db
      .select()
      .from(tripOccurrences)
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Ocorrência não encontrada" },
        { status: 404 }
      );
    }

    // Validar mudança de status
    if (body.status === "CLOSED" && existing.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Apenas ocorrências em andamento podem ser fechadas" },
        { status: 400 }
      );
    }

    // Atualizar
    await db
      .update(tripOccurrences)
      .set({
        ...safeBody,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      );

    const updated = await queryFirst<typeof tripOccurrences.$inferSelect>(db
      .select()
      .from(tripOccurrences)
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      )
      );

    return NextResponse.json({
      success: true,
      message: "Ocorrência atualizada com sucesso",
      data: updated,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao atualizar ocorrência:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar ocorrência" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da ocorrência
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

    const occurrenceId = parseInt(resolvedParams.id);
    if (isNaN(occurrenceId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se ocorrência existe
    const existing = await queryFirst<typeof tripOccurrences.$inferSelect>(db
      .select()
      .from(tripOccurrences)
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Ocorrência não encontrada" },
        { status: 404 }
      );
    }

    // Validar se ocorrência está vinculada a sinistro
    if (existing.insuranceClaim === "S") {
      return NextResponse.json(
        { error: "Não é possível excluir ocorrência com sinistro registrado" },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(tripOccurrences)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(tripOccurrences.id, occurrenceId),
          eq(tripOccurrences.organizationId, session.user.organizationId),
          isNull(tripOccurrences.deletedAt)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Ocorrência excluída com sucesso",
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao excluir ocorrência:", error);
    return NextResponse.json(
      { error: "Erro ao excluir ocorrência" },
      { status: 500 }
    );
  }
}









