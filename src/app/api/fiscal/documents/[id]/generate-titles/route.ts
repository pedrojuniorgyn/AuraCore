import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  generatePayableFromNFe,
  generateReceivableFromCTe,
} from "@/services/financial-title-generator";

/**
 * 💰 POST /api/fiscal/documents/:id/generate-titles
 * 
 * Gera títulos financeiros (Contas a Pagar/Receber) automaticamente
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const fiscalDocumentId = parseInt(resolvedParams.id);
    const userId = session.user.id;

    // Buscar documento para saber qual função chamar
    const { db } = await import("@/lib/db");
    const { fiscalDocuments } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(eq(fiscalDocuments.id, fiscalDocumentId));

    if (!document) {
      return NextResponse.json(
        { error: "Documento fiscal não encontrado" },
        { status: 404 }
      );
    }

    // Escolher função baseado na classificação
    let result;

    if (document.fiscalClassification === "PURCHASE") {
      result = await generatePayableFromNFe(fiscalDocumentId, userId);
    } else if (
      document.fiscalClassification === "CARGO" ||
      document.documentType === "CTE"
    ) {
      result = await generateReceivableFromCTe(fiscalDocumentId, userId);
    } else {
      return NextResponse.json(
        {
          error: `Documento classificado como ${document.fiscalClassification}. ` +
                 `Apenas PURCHASE e CARGO geram títulos automaticamente.`,
        },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erro ao gerar títulos" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${result.titlesGenerated} título(s) gerado(s) com sucesso`,
      ...result,
    });
  } catch (error: any) {
    console.error("❌ Erro ao gerar títulos:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}














