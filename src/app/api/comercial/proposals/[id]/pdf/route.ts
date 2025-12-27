import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commercialProposals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { proposalPdfGenerator } from "@/services/commercial/proposal-pdf-generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const proposalId = parseInt(resolvedParams.id);

    const [proposal] = await db
      .select()
      .from(commercialProposals)
      .where(eq(commercialProposals.id, proposalId));

    if (!proposal) {
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    }

    const pdfBuffer = await proposalPdfGenerator.generateProposalPdf({
      proposalNumber: proposal.proposalNumber,
      companyName: "Cliente", // TODO: Buscar do lead/partner
      contactName: "Contato",
      routes: JSON.parse(proposal.routes || "[]"),
      prices: JSON.parse(proposal.prices || "[]"),
      conditions: JSON.parse(proposal.conditions || "{}"),
      validityDays: proposal.validityDays || 15,
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Proposta-${proposal.proposalNumber}.pdf"`,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
















