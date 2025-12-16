import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commercialProposals } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, desc } from "drizzle-orm";
import { proposalPdfGenerator } from "@/services/commercial/proposal-pdf-generator";

export async function GET() {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const proposals = await db
      .select()
      .from(commercialProposals)
      .where(and(eq(commercialProposals.organizationId, ctx.organizationId), isNull(commercialProposals.deletedAt)))
      .orderBy(commercialProposals.createdAt);

    return NextResponse.json({ success: true, data: proposals });
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

    // Gerar número sequencial
    const lastProposal = await db
      .select()
      .from(commercialProposals)
      .where(and(eq(commercialProposals.organizationId, ctx.organizationId), isNull(commercialProposals.deletedAt)))
      .orderBy(desc(commercialProposals.id))
      .limit(1);

    const nextNumber = (lastProposal[0]?.id || 0) + 1;
    const proposalNumber = `PROP-${new Date().getFullYear()}-${String(nextNumber).padStart(4, "0")}`;

    const [createdId] = await db
      .insert(commercialProposals)
      .values({
        organizationId: ctx.organizationId,
        proposalNumber,
        leadId: body.leadId,
        partnerId: body.partnerId,
        routes: JSON.stringify(body.routes || []),
        prices: JSON.stringify(body.prices || []),
        conditions: JSON.stringify(body.conditions || {}),
        validityDays: body.validityDays || 15,
        createdBy: ctx.userId,
      })
      .$returningId();

    const proposalId = (createdId as any)?.id;
    const [proposal] = proposalId
      ? await db
          .select()
          .from(commercialProposals)
          .where(and(eq(commercialProposals.id, Number(proposalId)), eq(commercialProposals.organizationId, ctx.organizationId), isNull(commercialProposals.deletedAt)))
          .limit(1)
      : [];

    return NextResponse.json({ success: true, data: proposal });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
















