import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountsPayable } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { calculatePayment } from "@/services/payment-engine";

/**
 * 🧮 GET /api/financial/payables/:id/calculate-payment
 * 
 * Calcula juros, multa, IOF automaticamente para baixa
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const payableId = parseInt(resolvedParams.id);
    const paymentDate = request.nextUrl.searchParams.get("paymentDate");

    if (!paymentDate) {
      return NextResponse.json({ error: "Data de pagamento não informada" }, { status: 400 });
    }

    // Buscar conta a pagar
    const [payable] = await db
      .select()
      .from(accountsPayable)
      .where(
        and(
          eq(accountsPayable.id, payableId),
          eq(accountsPayable.organizationId, session.user.organizationId),
          isNull(accountsPayable.deletedAt)
        )
      );

    if (!payable) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });
    }

    // Calcular automaticamente
    const calculation = calculatePayment({
      originalAmount: parseFloat(payable.amount as any),
      dueDate: new Date(payable.dueDate),
      paymentDate: new Date(paymentDate),
    });

    return NextResponse.json(calculation);
  } catch (error: any) {
    console.error("❌ Erro ao calcular pagamento:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}






