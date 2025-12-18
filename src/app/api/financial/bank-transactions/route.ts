import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { bankTransactions } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  bankAccountId: z.coerce.number().int().positive(),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export async function GET(req: NextRequest) {
  try {
    const ctx = await getTenantContext();
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: "Query inválida", issues: parsed.error.issues }, { status: 400 });
    }

    const start = parsed.data.start ? new Date(`${parsed.data.start}T00:00:00Z`) : null;
    const end = parsed.data.end ? new Date(`${parsed.data.end}T23:59:59Z`) : null;

    const where = [
      eq(bankTransactions.organizationId, ctx.organizationId),
      eq(bankTransactions.bankAccountId, parsed.data.bankAccountId),
      ...(start ? [gte(bankTransactions.transactionDate, start)] : []),
      ...(end ? [lte(bankTransactions.transactionDate, end)] : []),
    ];

    const items = await db
      .select()
      .from(bankTransactions)
      .where(and(...where))
      .orderBy(desc(bankTransactions.transactionDate))
      .limit(parsed.data.limit);

    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Erro ao listar transações" }, { status: 500 });
  }
}

