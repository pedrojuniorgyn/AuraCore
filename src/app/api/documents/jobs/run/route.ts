import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { runDocumentJobsTick } from "@/lib/documents/jobs-worker";
import { withDI } from '@/shared/infrastructure/di/with-di';

export const runtime = "nodejs";

export const POST = withDI(async () => {
  try {
    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const result = await runDocumentJobsTick({ maxJobs: 10 });
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) return error;
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

