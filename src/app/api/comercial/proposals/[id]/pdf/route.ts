/**
 * GET /api/comercial/proposals/:id/pdf
 * Gera PDF da proposta comercial
 * 
 * @since E9 Fase 2 - Migrado para IProposalPdfGateway via DI
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { commercialProposals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { container } from "@/shared/infrastructure/di/container";
import { COMMERCIAL_TOKENS } from "@/modules/commercial/infrastructure/di/CommercialModule";
import type { IProposalPdfGateway } from "@/modules/commercial/domain/ports/output/IProposalPdfGateway";
import { Result } from "@/shared/domain";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const proposalId = parseInt(resolvedParams.id);

    const [proposal] = await db
      .select()
      .from(commercialProposals)
      .where(eq(commercialProposals.id, proposalId));

    if (!proposal) {
      return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    }

    // Resolver gateway via DI
    const proposalPdfGateway = container.resolve<IProposalPdfGateway>(
      COMMERCIAL_TOKENS.ProposalPdfGateway
    );

    const result = await proposalPdfGateway.generatePdf({
      proposalId,
      organizationId: session.user.organizationId,
      branchId: session.user.defaultBranchId || 1,
    });

    if (Result.isFail(result)) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const pdfBuffer = result.value;

    return new NextResponse(new Uint8Array(pdfBuffer), {
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
