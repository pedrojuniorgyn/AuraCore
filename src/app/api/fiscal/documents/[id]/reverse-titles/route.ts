import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { reverseTitles } from "@/services/financial-title-generator";

/**
 * 🔄 POST /api/fiscal/documents/:id/reverse-titles
 * 
 * Reverte geração de títulos (híbrido - reversível)
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

    const result = await reverseTitles(fiscalDocumentId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erro ao reverter títulos" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Títulos revertidos com sucesso",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao reverter títulos:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

























