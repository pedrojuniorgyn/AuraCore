import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountsPayable } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

// ============================================================================
// DOMAIN SERVICE (inline)
// TODO (E9.2): Migrar para src/modules/financial/domain/services/PaymentCalculator.ts
// ============================================================================

interface PaymentCalculation {
  originalAmount: number;
  dueDate: Date;
  paymentDate: Date;
  interestRate?: number; // % ao dia (padrão: 0.033% = 1% ao mês)
  fineRate?: number; // % fixo (padrão: 2%)
  iofRate?: number; // % fixo (padrão: 0.0038% ao dia)
  bankFee?: number; // Tarifa fixa
}

interface PaymentResult {
  originalAmount: number;
  interestAmount: number;
  fineAmount: number;
  iofAmount: number;
  bankFeeAmount: number;
  totalAmount: number;
  daysLate: number;
}

/**
 * Calcula juros, multa e IOF automaticamente
 * Lógica pura (Domain Service candidate)
 */
function calculatePayment(params: PaymentCalculation): PaymentResult {
  const {
    originalAmount,
    dueDate,
    paymentDate,
    interestRate = 0.033, // 1% ao mês = 0.033% ao dia
    fineRate = 2.0, // 2% de multa
    iofRate = 0.0038, // 0.0038% ao dia
    bankFee = 0,
  } = params;

  // Calcular dias de atraso
  const daysLate = Math.max(
    0,
    Math.floor((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Se não está atrasado, retornar valores zerados
  if (daysLate === 0) {
    return {
      originalAmount,
      interestAmount: 0,
      fineAmount: 0,
      iofAmount: 0,
      bankFeeAmount: bankFee,
      totalAmount: originalAmount + bankFee,
      daysLate: 0,
    };
  }

  // Calcular encargos
  const interestAmount = originalAmount * (interestRate / 100) * daysLate;
  const fineAmount = originalAmount * (fineRate / 100);
  const iofAmount = originalAmount * (iofRate / 100) * daysLate;
  const bankFeeAmount = bankFee;

  const totalAmount = 
    originalAmount + interestAmount + fineAmount + iofAmount + bankFeeAmount;

  return {
    originalAmount: Math.round(originalAmount * 100) / 100,
    interestAmount: Math.round(interestAmount * 100) / 100,
    fineAmount: Math.round(fineAmount * 100) / 100,
    iofAmount: Math.round(iofAmount * 100) / 100,
    bankFeeAmount: Math.round(bankFeeAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    daysLate,
  };
}

// ============================================================================
// API ROUTE
// ============================================================================

/**
 * 🧮 GET /api/financial/payables/:id/calculate-payment
 * 
 * Calcula juros, multa, IOF automaticamente para baixa
 * 
 * @since E9 Fase 1 - calculatePayment inlineado (Domain Service candidate)
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
      originalAmount: parseFloat(String(payable.amount)),
      dueDate: new Date(payable.dueDate),
      paymentDate: new Date(paymentDate),
    });

    return NextResponse.json(calculation);
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao calcular pagamento:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
