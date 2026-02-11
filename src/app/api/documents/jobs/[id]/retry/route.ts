import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { requeueFailedJob, updateDocumentStatus } from "@/lib/documents/document-db";
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';

export const runtime = "nodejs";

export const POST = withDI(async (
  req: NextRequest,
  context: RouteContext
) => {
  try {
    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const jobId = Number(id);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const r = await requeueFailedJob({ organizationId: ctx.organizationId, jobId });
    if (!r.ok || !r.documentId) {
      return NextResponse.json(
        { error: "Não foi possível reenfileirar (job não está FAILED ou excedeu tentativas)" },
        { status: 409 }
      );
    }

    // best-effort: limpar status do documento também
    try {
      await updateDocumentStatus({ organizationId: ctx.organizationId, documentId: r.documentId, status: "QUEUED", lastError: null });
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, queued: true, jobId, documentId: r.documentId });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) return error;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

