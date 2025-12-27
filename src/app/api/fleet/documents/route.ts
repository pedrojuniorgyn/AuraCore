import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vehicleDocuments, driverDocuments } from "@/lib/db/schema";
import { getTenantContext, hasAccessToBranch } from "@/lib/auth/context";
import { eq, and, isNull, lte } from "drizzle-orm";

// GET - Lista documentos vencendo
export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get("type"); // vehicle ou driver
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (type === "vehicle") {
      const docs = await db.select().from(vehicleDocuments)
        .where(and(
          eq(vehicleDocuments.organizationId, ctx.organizationId),
          lte(vehicleDocuments.expiryDate, in30Days),
          isNull(vehicleDocuments.deletedAt)
        ));
      return NextResponse.json({ data: docs });
    }

    if (type === "driver") {
      const docs = await db.select().from(driverDocuments)
        .where(and(
          eq(driverDocuments.organizationId, ctx.organizationId),
          lte(driverDocuments.expiryDate, in30Days),
          isNull(driverDocuments.deletedAt)
        ));
      return NextResponse.json({ data: docs });
    }

    return NextResponse.json({ data: [] });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Criar documento
export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();

    const branchIdCandidate = (body as any)?.branchId ?? ctx.defaultBranchId;
    if (branchIdCandidate === null || branchIdCandidate === undefined) {
      return NextResponse.json(
        { error: "branchId é obrigatório", code: "BRANCH_REQUIRED" },
        { status: 400 }
      );
    }
    const branchId = Number(branchIdCandidate);
    if (!Number.isFinite(branchId)) {
      return NextResponse.json(
        { error: "branchId inválido", code: "BRANCH_INVALID" },
        { status: 400 }
      );
    }
    if (!hasAccessToBranch(ctx, branchId)) {
      return NextResponse.json(
        { error: "Sem permissão para a filial", code: "BRANCH_FORBIDDEN" },
        { status: 403 }
      );
    }

    // Evitar override de campos sensíveis via spread
    const {
      id: _id,
      organizationId: _orgId,
      organization_id: _org_id,
      branchId: _branchId,
      branch_id: _branch_id,
      createdBy: _createdBy,
      created_by: _created_by,
      updatedBy: _updatedBy,
      updated_by: _updated_by,
      createdAt: _createdAt,
      created_at: _created_at,
      updatedAt: _updatedAt,
      updated_at: _updated_at,
      deletedAt: _deletedAt,
      deleted_at: _deleted_at,
      deletedBy: _deletedBy,
      deleted_by: _deleted_by,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    if (body.type === "vehicle") {
      const [createdId] = await db
        .insert(vehicleDocuments)
        .values({
          ...safeBody,
          organizationId: ctx.organizationId,
          branchId,
          createdBy: ctx.userId,
          version: 1,
        })
        .$returningId();

      const docId = (createdId as any)?.id;
      const [doc] = docId
        ? await db
            .select()
            .from(vehicleDocuments)
            .where(and(eq(vehicleDocuments.id, Number(docId)), eq(vehicleDocuments.organizationId, ctx.organizationId)))
            .limit(1)
        : [];

      return NextResponse.json({ success: true, data: doc });
    }

    if (body.type === "driver") {
      const [createdId] = await db
        .insert(driverDocuments)
        .values({
          ...safeBody,
          organizationId: ctx.organizationId,
          branchId,
          createdBy: ctx.userId,
          version: 1,
        })
        .$returningId();

      const docId = (createdId as any)?.id;
      const [doc] = docId
        ? await db
            .select()
            .from(driverDocuments)
            .where(and(eq(driverDocuments.id, Number(docId)), eq(driverDocuments.organizationId, ctx.organizationId)))
            .limit(1)
        : [];

      return NextResponse.json({ success: true, data: doc });
    }

    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
















