import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalEntries, journalEntryLines } from "@/lib/db/schema/accounting";
import { auth } from "@/lib/auth";
import { eq, and, desc, isNull } from "drizzle-orm";

/**
 * 📚 GET /api/accounting/journal-entries
 * 
 * Lista lançamentos contábeis
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
    const branchId = parseInt(request.headers.get("x-branch-id") || "1");
    
    const entries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          eq(journalEntries.branchId, branchId),
          isNull(journalEntries.deletedAt)
        )
      )
      .orderBy(desc(journalEntries.entryDate));
    
    return NextResponse.json({ data: entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 📝 POST /api/accounting/journal-entries
 * 
 * Criar lançamento manual
 */
export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    
    const organizationId = session.user.organizationId;
    const userId = session.user.id;
    const branchId = parseInt(request.headers.get("x-branch-id") || "1");
    
    const body = await request.json();
    const { entryDate, description, lines } = body;
    
    // Validar
    if (!lines || lines.length === 0) {
      return NextResponse.json({ error: "Lançamento sem linhas" }, { status: 400 });
    }
    
    const totalDebit = lines.reduce((sum: number, l: any) => sum + (l.debitAmount || 0), 0);
    const totalCredit = lines.reduce((sum: number, l: any) => sum + (l.creditAmount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: `Lançamento desbalanceado: D=${totalDebit}, C=${totalCredit}` },
        { status: 400 }
      );
    }
    
    // Gerar número
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const entryNumber = `${yearMonth}-MANUAL-${Date.now()}`;
    
    // Criar entry
    await db.insert(journalEntries).values({
      organizationId,
      branchId,
      entryNumber,
      entryDate: new Date(entryDate),
      sourceType: "MANUAL",
      description,
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      status: "DRAFT",
      createdBy: parseInt(userId),
      updatedBy: parseInt(userId),
    });
    
    // Buscar criado
    const [newEntry] = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          eq(journalEntries.organizationId, organizationId),
          eq(journalEntries.entryNumber, entryNumber)
        )
      );
    
    // Criar lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      await db.insert(journalEntryLines).values({
        journalEntryId: newEntry.id,
        organizationId,
        lineNumber: i + 1,
        chartAccountId: line.chartAccountId,
        debitAmount: (line.debitAmount || 0).toString(),
        creditAmount: (line.creditAmount || 0).toString(),
        description: line.description,
        costCenterId: line.costCenterId || null,
        categoryId: line.categoryId || null,
        partnerId: line.partnerId || null,
      });
    }
    
    return NextResponse.json({ success: true, entry: newEntry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}







