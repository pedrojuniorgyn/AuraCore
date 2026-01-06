import { NextRequest, NextResponse } from "next/server";
import { db, ensureConnection } from "@/lib/db";
import {
  accountsPayable,
  accountsReceivable,
  costCenters,
  chartOfAccounts,
  vehicles,
} from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and, isNull, gte, lte, sql } from "drizzle-orm";

/**
 * GET /api/financial/reports/dre
 * 
 * Parâmetros:
 * - type: 'consolidated' | 'by_plate' | 'by_dimension'
 * - startDate: YYYY-MM-DD
 * - endDate: YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    await ensureConnection();
    const ctx = await getTenantContext();
    const { searchParams } = new URL(request.url);

    const type = searchParams.get("type") || "consolidated";
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

    // Buscar receitas pagas no período
    const revenues = await db
      .select({
        amount: accountsReceivable.amountReceived,
        costCenterId: accountsReceivable.costCenterId,
        costCenterCode: costCenters.code,
        costCenterName: costCenters.name,
        linkedVehicleId: costCenters.linkedVehicleId,
        chartAccountId: accountsReceivable.chartAccountId,
        chartAccountCode: chartOfAccounts.code,
        chartAccountName: chartOfAccounts.name,
        chartAccountCategory: chartOfAccounts.category,
      })
      .from(accountsReceivable)
      .leftJoin(costCenters, eq(accountsReceivable.costCenterId, costCenters.id))
      .leftJoin(chartOfAccounts, eq(accountsReceivable.chartAccountId, chartOfAccounts.id))
      .where(
        and(
          eq(accountsReceivable.organizationId, ctx.organizationId),
          eq(accountsReceivable.status, "PAID"),
          gte(accountsReceivable.receiveDate, start),
          lte(accountsReceivable.receiveDate, end),
          isNull(accountsReceivable.deletedAt)
        )
      );

    // Buscar despesas pagas no período
    const expenses = await db
      .select({
        amount: accountsPayable.amountPaid,
        costCenterId: accountsPayable.costCenterId,
        costCenterCode: costCenters.code,
        costCenterName: costCenters.name,
        linkedVehicleId: costCenters.linkedVehicleId,
        chartAccountId: accountsPayable.chartAccountId,
        chartAccountCode: chartOfAccounts.code,
        chartAccountName: chartOfAccounts.name,
        chartAccountCategory: chartOfAccounts.category,
      })
      .from(accountsPayable)
      .leftJoin(costCenters, eq(accountsPayable.costCenterId, costCenters.id))
      .leftJoin(chartOfAccounts, eq(accountsPayable.chartAccountId, chartOfAccounts.id))
      .where(
        and(
          eq(accountsPayable.organizationId, ctx.organizationId),
          eq(accountsPayable.status, "PAID"),
          gte(accountsPayable.payDate, start),
          lte(accountsPayable.payDate, end),
          isNull(accountsPayable.deletedAt)
        )
      );

    // TIPO 1: DRE Consolidado
    if (type === "consolidated") {
      const totalRevenue = revenues.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const netProfit = totalRevenue - totalExpense;

      // Agrupar despesas por conta
      const expensesByAccount: Record<string, { code: string; name: string; category: string; total: number }> = {};
      expenses.forEach((exp) => {
        const key = exp.chartAccountCode || "SEM_CONTA";
        if (!expensesByAccount[key]) {
          expensesByAccount[key] = {
            code: exp.chartAccountCode,
            name: exp.chartAccountName || "Sem Conta",
            category: exp.chartAccountCategory,
            total: 0,
          };
        }
        expensesByAccount[key].total += exp.amount || 0;
      });

      return NextResponse.json({
        success: true,
        type: "consolidated",
        period: { startDate, endDate },
        data: {
          totalRevenue,
          totalExpense,
          netProfit,
          margin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
          expenses: Object.values(expensesByAccount),
        },
      });
    }

    // TIPO 2: DRE por Placa
    if (type === "by_plate") {
      const byPlate: Record<string, { vehicleId: number; costCenterCode: string; plate: string; revenue: number; expense: number }> = {};

      // Receitas por placa
      revenues.forEach((rev) => {
        if (rev.linkedVehicleId) {
          const key = `VEHICLE_${rev.linkedVehicleId}`;
          if (!byPlate[key]) {
            byPlate[key] = {
              vehicleId: rev.linkedVehicleId,
              costCenterCode: rev.costCenterCode,
              costCenterName: rev.costCenterName,
              revenue: 0,
              expense: 0,
            };
          }
          byPlate[key].revenue += Number(rev.amount) || 0;
        }
      });

      // Despesas por placa
      expenses.forEach((exp) => {
        if (exp.linkedVehicleId) {
          const key = `VEHICLE_${exp.linkedVehicleId}`;
          if (!byPlate[key]) {
            byPlate[key] = {
              vehicleId: exp.linkedVehicleId,
              costCenterCode: exp.costCenterCode,
              costCenterName: exp.costCenterName,
              revenue: 0,
              expense: 0,
            };
          }
          byPlate[key].expense += Number(exp.amount) || 0;
        }
      });

      // Calcular lucro/margem
      const results = Object.values(byPlate).map((item: { plate: string; revenue: number; expense: number }) => ({
        ...item,
        netProfit: item.revenue - item.expense,
        margin: item.revenue > 0 ? ((item.revenue - item.expense) / item.revenue) * 100 : 0,
      }));

      return NextResponse.json({
        success: true,
        type: "by_plate",
        period: { startDate, endDate },
        data: results,
      });
    }

    // TIPO 3: DRE por Dimensão (Frota Própria vs Terceiros)
    if (type === "by_dimension") {
      const dimensions = {
        ownFleet: { revenue: 0, expense: 0 },
        thirdParty: { revenue: 0, expense: 0 },
        administrative: { revenue: 0, expense: 0 },
        financial: { revenue: 0, expense: 0 },
        other: { revenue: 0, expense: 0 },
      };

      // Classificar receitas
      revenues.forEach((rev) => {
        const category = rev.chartAccountCategory;
        if (category === "OPERATIONAL_OWN_FLEET") {
          dimensions.ownFleet.revenue += Number(rev.amount) || 0;
        } else if (category === "OPERATIONAL_THIRD_PARTY") {
          dimensions.thirdParty.revenue += Number(rev.amount) || 0;
        } else {
          dimensions.other.revenue += Number(rev.amount) || 0;
        }
      });

      // Classificar despesas
      expenses.forEach((exp) => {
        const category = exp.chartAccountCategory;
        if (category === "OPERATIONAL_OWN_FLEET") {
          dimensions.ownFleet.expense += Number(exp.amount) || 0;
        } else if (category === "OPERATIONAL_THIRD_PARTY") {
          dimensions.thirdParty.expense += Number(exp.amount) || 0;
        } else if (category === "ADMINISTRATIVE") {
          dimensions.administrative.expense += Number(exp.amount) || 0;
        } else if (category === "FINANCIAL") {
          dimensions.financial.expense += Number(exp.amount) || 0;
        } else {
          dimensions.other.expense += Number(exp.amount) || 0;
        }
      });

      // Calcular resultados
      const results = Object.entries(dimensions).map(([key, values]) => ({
        dimension: key,
        revenue: values.revenue,
        expense: values.expense,
        netProfit: values.revenue - values.expense,
        margin: values.revenue > 0 ? ((values.revenue - values.expense) / values.revenue) * 100 : 0,
      }));

      return NextResponse.json({
        success: true,
        type: "by_dimension",
        period: { startDate, endDate },
        data: results,
      });
    }

    return NextResponse.json(
      { error: "Tipo de relatório inválido. Use: consolidated, by_plate, by_dimension" },
      { status: 400 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao gerar DRE:", error);
    return NextResponse.json(
      { error: "Erro ao gerar DRE", details: errorMessage },
      { status: 500 }
    );
  }
}

















