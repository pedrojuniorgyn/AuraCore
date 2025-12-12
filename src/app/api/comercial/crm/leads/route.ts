import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crmLeads } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull } from "drizzle-orm";

export async function GET() {
  try {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    const body = await request.json();

    const [lead] = await db
      .insert(crmLeads)
      .values({
        organizationId: ctx.organizationId,
        companyName: body.companyName,
        cnpj: body.cnpj,
        contactName: body.contactName,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        segment: body.segment,
        source: body.source,
        stage: body.stage || "PROSPECTING",
        estimatedValue: body.estimatedValue,
        ownerId: ctx.user.id,
        createdBy: ctx.user.id,
      })
      .returning();

    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}














