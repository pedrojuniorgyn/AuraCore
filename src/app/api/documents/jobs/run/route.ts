import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { runDocumentJobsTick } from "@/lib/documents/jobs-worker";

export const runtime = "nodejs";

export async function POST() {
  try {
    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await runDocumentJobsTick({ maxJobs: 10 });
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: error?.message ?? String(error) }, { status: 500 });
  }
}

