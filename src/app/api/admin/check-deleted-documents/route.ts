import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * 🔍 GET /api/admin/check-deleted-documents
 * 
 * Verifica documentos deletados no banco de dados
 */
export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;

    // Buscar TODOS os documentos (incluindo deletados)
    const allDocuments = await db.execute(sql`
      SELECT 
        id,
        document_type AS documentType,
        document_number AS documentNumber,
        access_key AS accessKey,
        partner_name AS partnerName,
        net_amount AS netAmount,
        fiscal_classification AS fiscalClassification,
        deleted_at AS deletedAt,
        created_at AS createdAt
      FROM fiscal_documents
      WHERE organization_id = ${organizationId}
      ORDER BY id DESC
    `);

    const documents = allDocuments.recordset;

    // Separar ativos e deletados
    const active = documents.filter((d: any) => !d.deletedAt);
    const deleted = documents.filter((d: any) => d.deletedAt);

    // Verificar duplicatas (incluindo deletados)
    const accessKeys = documents.map((d: any) => d.accessKey);
    const duplicates = accessKeys.filter((key: string, index: number) => 
      accessKeys.indexOf(key) !== index
    );

    return NextResponse.json({
      summary: {
        total: documents.length,
        active: active.length,
        deleted: deleted.length,
        duplicateKeys: [...new Set(duplicates)],
      },
      documents: {
        active: active.map((d: any) => ({
          id: d.id,
          type: d.documentType,
          number: d.documentNumber,
          partner: d.partnerName,
          amount: parseFloat(d.netAmount),
          classification: d.fiscalClassification,
          createdAt: d.createdAt,
        })),
        deleted: deleted.map((d: any) => ({
          id: d.id,
          type: d.documentType,
          number: d.documentNumber,
          partner: d.partnerName,
          amount: parseFloat(d.netAmount),
          classification: d.fiscalClassification,
          deletedAt: d.deletedAt,
          createdAt: d.createdAt,
        })),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao verificar documentos deletados:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



























