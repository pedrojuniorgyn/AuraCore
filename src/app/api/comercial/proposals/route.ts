import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commercialProposals } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, desc } from "drizzle-orm";
import { proposalPdfGenerator } from "@/services/commercial/proposal-pdf-generator";
import { queryFirst } from "@/lib/db/query-helpers";

export async function GET() {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    const ctx = await getTenantContext();

    const proposals = await db
      .select()
      .from(commercialProposals)
      .where(eq(commercialProposals.organizationId, ctx.organizationId))
      .orderBy(commercialProposals.createdAt);

    return NextResponse.json({ success: true, data: proposals });
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

    // Gerar número sequencial - Paginação no SQL Server (ADR-0006)
    type ProposalRow = { id: number };
    const lastProposal = await queryFirst<ProposalRow>(
      db
        .select({ id: commercialProposals.id })
        .from(commercialProposals)
        .where(eq(commercialProposals.organizationId, ctx.organizationId))
        .orderBy(desc(commercialProposals.id))
    );

    const nextNumber = (lastProposal?.id || 0) + 1;
    const proposalNumber = `PROP-${new Date().getFullYear()}-${String(nextNumber).padStart(4, "0")}`;

    interface ProposalInsert {
      organizationId: number;
      proposalNumber: string;
      leadId?: number;
      partnerId?: number;
      routes: string;
      prices: string;
      conditions: string;
      validityDays: number;
      createdBy: string;
    }
    
    const insertValues: ProposalInsert = {
      organizationId: ctx.organizationId,
      proposalNumber,
      leadId: body.leadId,
      partnerId: body.partnerId,
      routes: JSON.stringify(body.routes || []),
      prices: JSON.stringify(body.prices || []),
      conditions: JSON.stringify(body.conditions || {}),
      validityDays: body.validityDays || 15,
      createdBy: ctx.userId,
    };

    const inserted = await db.insert(commercialProposals).values(insertValues);
    const insertedData = (inserted.recordset || inserted) as Array<{ id?: number }>;
    const proposalId = insertedData[0]?.id;
    if (!proposalId) {
      return NextResponse.json(
        { error: "Falha ao criar proposta (id não retornado)" },
        { status: 500 }
      );
    }

    const [proposal] = await db
      .select()
      .from(commercialProposals)
      .where(
        and(
          eq(commercialProposals.id, Number(proposalId)),
          eq(commercialProposals.organizationId, ctx.organizationId)
        )
      );

    if (!proposal) {
      return NextResponse.json(
        { error: "Falha ao criar proposta (registro não encontrado após insert)" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: proposal }, { status: 201 });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
















