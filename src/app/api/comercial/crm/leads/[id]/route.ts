import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crmLeads } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getTenantContext();
    const leadId = parseInt(params.id);
    const body = await request.json();

    const [lead] = await db
      .update(crmLeads)
      .set({
        stage: body.stage,
        status: body.status,
        score: body.score,
        estimatedValue: body.estimatedValue,
        probability: body.probability,
        wonDate: body.wonDate ? new Date(body.wonDate) : null,
        lostReason: body.lostReason,
      })
      .where(
        and(
          eq(crmLeads.id, leadId),
          eq(crmLeads.organizationId, ctx.organizationId)
        )
      )
      .returning();

    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}






