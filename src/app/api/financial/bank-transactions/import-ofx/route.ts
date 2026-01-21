import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isS3Configured, uploadBufferToS3 } from "@/lib/storage/s3";
import { insertDocument, insertJob } from "@/lib/documents/document-db";
import { DOCUMENT_JOB_TYPES } from "@/lib/documents/jobs-worker";
import { importOfxToBankTransactions } from "@/lib/financial/ofx-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/financial/bank-transactions/import-ofx
 * Importa arquivo OFX e cria transações bancárias
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const bankAccountIdRaw = formData.get("bankAccountId") as string;
    const bankAccountId = Number(bankAccountIdRaw);

    if (!file || !Number.isFinite(bankAccountId) || bankAccountId <= 0) {
      return NextResponse.json(
        { error: "Arquivo OFX e conta bancária são obrigatórios" },
        { status: 400 }
      );
    }

    const orgId = Number(session.user.organizationId);
    const userId = String(session.user.id);

    // Se storage externo estiver configurado, usa pipeline assíncrono (jobs).
    if (isS3Configured()) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const safeName = String(file.name || "extrato.ofx").replace(/[^\w.\-]+/g, "_");
      const key = `org/${orgId}/bank/ofx/${Date.now()}_${safeName}`;

      const up = await uploadBufferToS3({
        key,
        contentType: file.type || "application/octet-stream",
        body: buffer,
      });

      const documentId = await insertDocument({
        organizationId: orgId,
        docType: "FINANCIAL_OFX",
        entityTable: "bank_accounts",
        entityId: bankAccountId,
        fileName: safeName,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: buffer.byteLength,
        storageProvider: "S3",
        storageBucket: up.bucket,
        storageKey: up.key,
        storageUrl: up.url,
        status: "QUEUED",
        createdBy: userId,
        metadata: { bankAccountId },
      });

      const jobId = await insertJob({
        organizationId: orgId,
        documentId,
        jobType: DOCUMENT_JOB_TYPES.FINANCIAL_OFX_IMPORT,
        payload: { bankAccountId, userId },
      });

      return NextResponse.json(
        {
          success: true,
          queued: true,
          documentId,
          jobId,
          message: "Importação enfileirada. Acompanhe no Document Pipeline (Configurações).",
        },
        { status: 202 }
      );
    }

    // Fallback (sem storage externo): mantém comportamento antigo (sincrono).
    const content = await file.text();
    const result = await importOfxToBankTransactions({
      organizationId: orgId,
      userId,
      bankAccountId,
      content,
    });

    return NextResponse.json({
      success: true,
      message: `${result.inserted} transações importadas com sucesso`,
      count: result.inserted,
      skipped: result.skipped,
      parsed: result.parsed,
      queued: false,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("❌ Erro ao importar OFX:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

