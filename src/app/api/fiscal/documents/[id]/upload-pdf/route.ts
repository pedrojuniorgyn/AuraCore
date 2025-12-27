import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getSignedDownloadUrl, isS3Configured, uploadBufferToS3 } from "@/lib/storage/s3";
import { insertDocument } from "@/lib/documents/document-db";

/**
 * 📄 POST /api/fiscal/documents/:id/upload-pdf
 * 
 * Upload de PDF do documento fiscal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = parseInt(resolvedParams.id);
    const formData = await request.formData();
    const file = formData.get("pdf") as File;

    if (!file) {
      return NextResponse.json({ error: "Arquivo PDF não enviado" }, { status: 400 });
    }

    // Validar tipo
    if (!file.type.includes("pdf")) {
      return NextResponse.json({ error: "Apenas arquivos PDF são permitidos" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const orgId = Number(session.user.organizationId);
    const fileName = `${documentId}_${Date.now()}.pdf`;
    let storedPathOrUrl: string;
    let downloadUrl: string | null = null;

    if (isS3Configured()) {
      const key = `org/${orgId}/fiscal/documents/${documentId}/${fileName}`;
      const up = await uploadBufferToS3({
        key,
        contentType: "application/pdf",
        body: buffer,
      });
      storedPathOrUrl = up.url;
      // Se não houver URL pública, gera URL assinada para uso imediato
      if (storedPathOrUrl.startsWith("s3://")) {
        downloadUrl = await getSignedDownloadUrl({ key, expiresSeconds: 900 });
      }

      // Registra no document_store (monitor)
      await insertDocument({
        organizationId: orgId,
        docType: "FISCAL_DOCUMENT_PDF",
        entityTable: "fiscal_documents",
        entityId: documentId,
        fileName,
        mimeType: "application/pdf",
        sizeBytes: buffer.byteLength,
        storageProvider: "S3",
        storageBucket: up.bucket,
        storageKey: up.key,
        storageUrl: up.url,
        status: "SUCCEEDED",
        createdBy: String(session.user.id),
        metadata: { fiscalDocumentId: documentId },
      });
    } else {
      // Fallback: manter comportamento antigo (filesystem), mas recomenda-se S3/MinIO em produção
      const { writeFile, mkdir } = await import("fs/promises");
      const { join } = await import("path");
      const uploadsDir = join(process.cwd(), "uploads", "fiscal", orgId.toString());
      await mkdir(uploadsDir, { recursive: true });
      const filePath = join(uploadsDir, fileName);
      await writeFile(filePath, buffer);
      storedPathOrUrl = `/uploads/fiscal/${orgId}/${fileName}`;
    }
    
    await db.execute(sql`
      UPDATE fiscal_documents
      SET 
        pdf_path = ${storedPathOrUrl},
        updated_at = GETDATE(),
        updated_by = ${session.user.id}
      WHERE id = ${documentId}
    `);

    return NextResponse.json({
      success: true,
      filePath: storedPathOrUrl,
      downloadUrl,
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao fazer upload do PDF:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}














