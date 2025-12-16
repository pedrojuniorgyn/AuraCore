import { NextRequest, NextResponse } from "next/server";
import { withPermission } from "@/lib/auth/api-guard";
import { withMssqlTransaction } from "@/lib/db/mssql-transaction";
import sql from "mssql";
import { getTenantContext, hasAccessToBranch } from "@/lib/auth/context";

/**
 * POST /api/financial/billing/:id/finalize
 * 🔐 Requer permissão: financial.billing.approve
 * 
 * Finaliza fatura e cria título no Contas a Receber
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withPermission(request, "financial.billing.approve", async (user, ctx) => {
    const resolvedParams = await params;
    const billingId = Number(resolvedParams.id);

    if (!Number.isFinite(billingId) || billingId <= 0) {
      return NextResponse.json(
        { error: "ID de fatura inválido" },
        { status: 400 }
      );
    }

    try {
      const tenant = await getTenantContext();

      // Branch scoping: header precisa ser válido e permitido
      const branchHeader = request.headers.get("x-branch-id");
      const branchId = branchHeader ? Number(branchHeader) : tenant.defaultBranchId;
      if (!branchId || Number.isNaN(branchId)) {
        return NextResponse.json(
          { error: "Informe x-branch-id (ou defina defaultBranchId)" },
          { status: 400 }
        );
      }
      if (!hasAccessToBranch(tenant, branchId)) {
        return NextResponse.json(
          { error: "Forbidden", message: "Sem acesso à filial informada" },
          { status: 403 }
        );
      }

      const result = await withMssqlTransaction(async (tx) => {
        // Buscar fatura com lock
        const billingRes = await tx
          .request()
          .input("billingId", sql.Int, Math.trunc(billingId))
          .input("orgId", sql.Int, tenant.organizationId)
          .query(
            `
            SELECT TOP 1 *
            FROM billing_invoices WITH (UPDLOCK, ROWLOCK)
            WHERE id = @billingId
              AND organization_id = @orgId
              AND deleted_at IS NULL
          `
          );

        const billing = billingRes.recordset?.[0];
        if (!billing) {
          return { status: 404 as const, payload: { error: "Fatura não encontrada" } };
        }

        if (billing.status === "FINALIZED") {
          return { status: 400 as const, payload: { error: "Fatura já foi finalizada" } };
        }

        if (!billing.barcode_number && !billing.barcodeNumber) {
          return {
            status: 400 as const,
            payload: { error: "Gere o boleto antes de finalizar a fatura" },
          };
        }

        // Criar título em contas a receber
        const receivableInsert = await tx
          .request()
          .input("orgId", sql.Int, tenant.organizationId)
          .input("branchId", sql.Int, Number(billing.branch_id ?? billing.branchId))
          .input("partnerId", sql.Int, Number(billing.customer_id ?? billing.customerId))
          .input("description", sql.NVarChar(sql.MAX), `Faturamento consolidado - ${billing.total_ctes ?? billing.totalCtes} CTes`)
          .input("documentNumber", sql.NVarChar(100), String(billing.invoice_number ?? billing.invoiceNumber))
          .input("issueDate", sql.DateTime2, new Date(billing.issue_date ?? billing.issueDate))
          .input("dueDate", sql.DateTime2, new Date(billing.due_date ?? billing.dueDate))
          .input("amount", sql.Decimal(18, 2), Number(billing.net_value ?? billing.netValue))
          .input("createdBy", sql.NVarChar(255), tenant.userId)
          .input("updatedBy", sql.NVarChar(255), tenant.userId)
          .query(
            `
            INSERT INTO accounts_receivable (
              organization_id, branch_id,
              partner_id,
              description, document_number,
              issue_date, due_date,
              amount,
              status, origin,
              created_by, updated_by,
              created_at, updated_at, deleted_at, version
            )
            OUTPUT INSERTED.id
            VALUES (
              @orgId, @branchId,
              @partnerId,
              @description, @documentNumber,
              @issueDate, @dueDate,
              @amount,
              'OPEN', 'BILLING',
              @createdBy, @updatedBy,
              GETDATE(), GETDATE(), NULL, 1
            )
          `
          );

        const receivableId = receivableInsert.recordset?.[0]?.id;
        if (!receivableId) {
          throw new Error("Falha ao criar accounts_receivable");
        }

        // Atualizar fatura
        await tx
          .request()
          .input("billingId", sql.Int, Math.trunc(billingId))
          .input("orgId", sql.Int, tenant.organizationId)
          .input("receivableId", sql.Int, Number(receivableId))
          .input("updatedBy", sql.NVarChar(255), tenant.userId)
          .query(
            `
            UPDATE billing_invoices
            SET
              accounts_receivable_id = @receivableId,
              status = 'FINALIZED',
              updated_at = GETDATE(),
              updated_by = @updatedBy
            WHERE id = @billingId
              AND organization_id = @orgId
          `
          );

        return {
          status: 200 as const,
          payload: {
            success: true,
            message: "Fatura finalizada com sucesso!",
            data: { billingId, receivableId },
          },
        };
      });

      return NextResponse.json(result.payload, { status: result.status });
    } catch (error: any) {
      console.error("❌ Erro ao finalizar fatura:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  });
}















