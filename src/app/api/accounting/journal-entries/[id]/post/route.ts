import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateJournalEntry } from "@/services/accounting-engine";

/**
 * 📊 POST /api/accounting/journal-entries/:id/post
 * 
 * Contabilizar documento fiscal (gerar lançamento)
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

    const result = await generateJournalEntry(fiscalDocumentId, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Lançamento contábil gerado com sucesso",
      ...result,
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao contabilizar:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
