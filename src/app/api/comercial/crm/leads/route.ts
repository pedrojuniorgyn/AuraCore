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
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      organizationId: _orgId,
      branchId: _branchId,
      createdBy: _createdBy,
      updatedBy: _updatedBy,
      deletedAt: _deletedAt,
      deletedBy: _deletedBy,
      version: _version,
      ...safeBody
    } = (body ?? {}) as Record<string, unknown>;

    const [createdId] = await db
      .insert(crmLeads)
      .values({
        ...safeBody,
        organizationId: ctx.organizationId,
        stage: (safeBody as any)?.stage || "PROSPECTING",
        ownerId: ctx.userId,
        createdBy: ctx.userId,
      })
      .$returningId();

    const leadId = (createdId as any)?.id;
    const [lead] = leadId
      ? await db
          .select()
          .from(crmLeads)
          .where(and(eq(crmLeads.id, Number(leadId)), eq(crmLeads.organizationId, ctx.organizationId), isNull(crmLeads.deletedAt)))
          .limit(1)
      : [];

    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
















