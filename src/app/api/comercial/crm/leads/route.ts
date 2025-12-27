import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crmLeads } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

export async function GET() {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const leads = await db
      .select()
      .from(crmLeads)
      .where(
        and(
          eq(crmLeads.organizationId, ctx.organizationId),
          isNull(crmLeads.deletedAt)
        )
      )
      .orderBy(crmLeads.createdAt);

    return NextResponse.json({ success: true, data: leads });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();
    const body = await request.json();

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

    // Drizzle MSSQL: $returningId existe em runtime, mas pode não estar tipado.
    // Além disso, nunca devolvemos success=true com data undefined.
    const [createdId] = await (db
      .insert(crmLeads)
      .values({
        ...safeBody,
        organizationId: ctx.organizationId,
        stage: (safeBody as any)?.stage || "PROSPECTING",
        ownerId: ctx.userId,
        createdBy: ctx.userId,
      } as any) as any).$returningId();

    const leadId = (createdId as any)?.id;
    if (!leadId) {
      return NextResponse.json(
        { error: "Falha ao criar lead (id não retornado)" },
        { status: 500 }
      );
    }

    const [lead] = await db
      .select()
      .from(crmLeads)
      .where(
        and(
          eq(crmLeads.id, Number(leadId)),
          eq(crmLeads.organizationId, ctx.organizationId),
          isNull(crmLeads.deletedAt)
        )
      );

    if (!lead) {
      return NextResponse.json(
        { error: "Falha ao criar lead (registro não encontrado após insert)" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}















