import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { getJob } from "@/lib/documents/document-db";
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';

export const runtime = "nodejs";

export const GET = withDI(async (
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

    const job = await getJob({ organizationId: ctx.organizationId, jobId });
    if (!job) {
      return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) return error;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

