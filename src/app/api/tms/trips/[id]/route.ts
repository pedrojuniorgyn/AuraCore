import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { queryFirst } from "@/lib/db/query-helpers";
import { updateTripSchema } from "@/lib/validation/tms-schemas";
import { getTenantContext } from "@/lib/auth/context";

// GET - Buscar viagem específica
const idSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.coerce.number().int().positive({ message: "Invalid trip id" })
);

const safeJson = async <T>(request: Request): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
};

const unauthorizedResponse = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// GET - Buscar viagem específica
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const tenant = await getTenantContext();
    if (!tenant) {
      return unauthorizedResponse;
    }

    // ✅ S1.1 Batch 3 Phase 2: Validar ID com Zod
    const validation = idSchema.safeParse(resolvedParams.id);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid trip id",
        },
        { status: 400 }
      );
    }

    const tripId = validation.data;

    const trip = await queryFirst<typeof trips.$inferSelect>(
      db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.id, tripId),
            eq(trips.organizationId, tenant.organizationId),
            eq(trips.branchId, tenant.branchId),
            isNull(trips.deletedAt)
          )
        )
        .orderBy(asc(trips.id))
    );

    if (!trip) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: trip });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Error fetching trip:", error);
    return NextResponse.json(
      { error: "Failed to fetch trip" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar viagem
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const tenant = await getTenantContext();
    if (!tenant) {
      return unauthorizedResponse;
    }

    // ✅ S1.1 Batch 3 Phase 2: Validar ID com Zod
    const idValidation = idSchema.safeParse(resolvedParams.id);
    if (!idValidation.success) {
      return NextResponse.json(
        {
          error: "Invalid trip id",
        },
        { status: 400 }
      );
    }

    const tripId = idValidation.data;

    const body = await safeJson<unknown>(req);
    
    // ✅ S1.1 Batch 3 Phase 2: Validar body com Zod
    const validation = updateTripSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
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
            eq(trips.organizationId, tenant.organizationId),
            eq(trips.branchId, tenant.branchId),
            isNull(trips.deletedAt)
          )
        )
        .orderBy(asc(trips.id))
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    // Validar mudança de status
    if (body.status === "COMPLETED" && existing.status !== "IN_TRANSIT") {
      return NextResponse.json(
        { error: "Only trips in transit can be completed" },
        { status: 400 }
      );
    }

    if (body.status === "CANCELED" && existing.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot cancel a completed trip" },
        { status: 400 }
      );
    }

    // Atualizar
    await db
      .update(trips)
      .set({
        ...safeBody,
        updatedBy: tenant.userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(trips.id, tripId),
          eq(trips.organizationId, tenant.organizationId),
          eq(trips.branchId, tenant.branchId),
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
            eq(trips.organizationId, tenant.organizationId),
            eq(trips.branchId, tenant.branchId),
            isNull(trips.deletedAt)
          )
        )
        .orderBy(asc(trips.id))
    );

    return NextResponse.json({
      success: true,
      message: "Trip updated successfully",
      data: updated,
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da viagem
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const resolvedParams = await params;
    const tenant = await getTenantContext();
    if (!tenant) {
      return unauthorizedResponse;
    }

    const tripValidation = idSchema.safeParse(resolvedParams.id);
    if (!tripValidation.success) {
      return NextResponse.json({ error: "Invalid trip id" }, { status: 400 });
    }
    const tripId = tripValidation.data;

    // Verificar se viagem existe
    const existing = await queryFirst<typeof trips.$inferSelect>(
      db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.id, tripId),
            eq(trips.organizationId, tenant.organizationId),
            eq(trips.branchId, tenant.branchId),
            isNull(trips.deletedAt)
          )
        )
        .orderBy(asc(trips.id))
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Trip not found" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing.status === "IN_TRANSIT") {
      return NextResponse.json(
        { error: "Cannot delete a trip in transit" },
        { status: 400 }
      );
    }

    if (existing.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot delete a completed trip" },
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
      .where(
        and(
          eq(trips.id, tripId),
          eq(trips.organizationId, tenant.organizationId),
          eq(trips.branchId, tenant.branchId),
          isNull(trips.deletedAt)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Error deleting trip:", error);
    return NextResponse.json(
      { error: "Failed to delete trip" },
      { status: 500 }
    );
  }
}








