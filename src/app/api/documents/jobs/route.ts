import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { listJobs } from "@/lib/documents/document-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? "50");
    const jobs = await listJobs({ organizationId: ctx.organizationId, limit });
    return NextResponse.json({ success: true, jobs });
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error?.message ?? String(error) }, { status: 500 });
  }
}

