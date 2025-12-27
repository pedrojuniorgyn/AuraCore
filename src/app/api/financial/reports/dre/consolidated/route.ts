import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { accountsReceivable, accountsPayable } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { sql } from "drizzle-orm";

/**
 * GET /api/financial/reports/dre/consolidated
 * 
 * DRE - Demonstração de Resultado do Exercício
 * Relatório consolidado de receitas e despesas
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate e endDate são obrigatórios" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Receitas (Contas a Receber pagas no período)
    const revenues = await db.execute(sql`
      SELECT 
        CAST(SUM(CAST(amount AS DECIMAL(18,2))) AS DECIMAL(18,2)) AS total
      FROM accounts_receivable
      WHERE organization_id = ${ctx.organizationId}
        AND status = 'PAID'
        AND due_date >= ${start.toISOString().split('T')[0]}
        AND due_date <= ${end.toISOString().split('T')[0]}
    `);

    // Despesas (Contas a Pagar pagas no período)
    const expenses = await db.execute(sql`
      SELECT 
        CAST(SUM(CAST(amount AS DECIMAL(18,2))) AS DECIMAL(18,2)) AS total
      FROM accounts_payable
      WHERE organization_id = ${ctx.organizationId}
        AND status = 'PAID'
        AND due_date >= ${start.toISOString().split('T')[0]}
        AND due_date <= ${end.toISOString().split('T')[0]}
    `);

    const totalRevenue = Number((revenues as any)[0]?.total || 0);
    const totalExpense = Number((expenses as any)[0]?.total || 0);
    const netProfit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate,
          endDate,
        },
        revenue: {
          total: totalRevenue,
          formatted: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        },
        expenses: {
          total: totalExpense,
          formatted: `R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        },
        netProfit: {
          total: netProfit,
          formatted: `R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          margin: profitMargin,
        },
      },
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao gerar DRE:", error);
    return NextResponse.json(
      { error: errorMessage || "Erro ao gerar relatório" },
      { status: 500 }
    );
  }
}



