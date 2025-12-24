import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { getJob } from "@/lib/documents/document-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const jobId = Number(id);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const job = await getJob({ organizationId: ctx.organizationId, jobId });
    if (!job) {
      return NextResponse.json({ error: "Job não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error?.message ?? String(error) }, { status: 500 });
  }
}

