import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { resolveBranchIdOrThrow } from "@/lib/auth/branch";
import { withMssqlTransaction } from "@/lib/db/mssql-transaction";
import sql from "mssql";

/**
 * 💰 POST /api/financial/payables/:id/pay
 * 
 * Baixa de conta a pagar com juros, multa, IOF, tarifas
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const ctx = await getTenantContext();
    const branchId = resolveBranchIdOrThrow(request.headers, ctx);

    const payableId = Number(resolvedParams.id);
    if (!Number.isFinite(payableId) || payableId <= 0) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    
    const body = await request.json();
    const {
      paymentDate,
      paymentMethod,
      bankAccountId,
      interestAmount = 0,
      fineAmount = 0,
      discountAmount = 0,
      iofAmount = 0,
      bankFeeAmount = 0,
      otherFeesAmount = 0,
      notes,
      documentNumber,
      autoPost = true, // Gerar lançamento contábil automaticamente
    } = body;
    
    const paymentDt = new Date(paymentDate);
    if (Number.isNaN(paymentDt.getTime())) {
      return NextResponse.json({ error: "paymentDate inválido" }, { status: 400 });
    }

    const interest = Number(interestAmount) || 0;
    const fine = Number(fineAmount) || 0;
    const discount = Number(discountAmount) || 0;
    const iof = Number(iofAmount) || 0;
    const bankFee = Number(bankFeeAmount) || 0;
    const otherFees = Number(otherFeesAmount) || 0;

    const result = await withMssqlTransaction(async (tx) => {
      // 1) Buscar título com lock para evitar dupla baixa
      const payableResult = await tx
        .request()
        .input("orgId", sql.Int, ctx.organizationId)
        .input("payableId", sql.Int, Math.trunc(payableId))
        .query(
          `
          SELECT TOP 1 *
          FROM accounts_payable WITH (UPDLOCK, ROWLOCK)
          WHERE id = @payableId
            AND organization_id = @orgId
            AND deleted_at IS NULL
        `
        );

      const payable = payableResult.recordset?.[0];
      if (!payable) {
        return { status: 404 as const, payload: { error: "Conta a pagar não encontrada" } };
      }
      if (payable.status === "PAID") {
        return { status: 400 as const, payload: { error: "Conta já paga" } };
      }

      const originalAmount = Number(payable.amount);
      if (!Number.isFinite(originalAmount)) {
        return { status: 500 as const, payload: { error: "Valor do título inválido" } };
      }

      const netAmount =
        originalAmount + interest + fine - discount + iof + bankFee + otherFees;

      // 2) Inserir transação financeira (auditoria: userId UUID string)
      const txInsert = await tx
        .request()
        .input("orgId", sql.BigInt, ctx.organizationId)
        .input("branchId", sql.BigInt, branchId)
        .input("payableId", sql.BigInt, Math.trunc(payableId))
        .input("txDate", sql.DateTime, paymentDt)
        .input("paymentMethod", sql.VarChar(50), String(paymentMethod))
        .input("bankAccountId", sql.BigInt, bankAccountId ? Number(bankAccountId) : null)
        .input("originalAmount", sql.Decimal(18, 2), originalAmount)
        .input("interestAmount", sql.Decimal(18, 2), interest)
        .input("fineAmount", sql.Decimal(18, 2), fine)
        .input("discountAmount", sql.Decimal(18, 2), discount)
        .input("iofAmount", sql.Decimal(18, 2), iof)
        .input("bankFeeAmount", sql.Decimal(18, 2), bankFee)
        .input("otherFeesAmount", sql.Decimal(18, 2), otherFees)
        .input("netAmount", sql.Decimal(18, 2), netAmount)
        .input("notes", sql.NVarChar(sql.MAX), notes ?? null)
        .input("documentNumber", sql.VarChar(50), documentNumber ?? null)
        .input("createdBy", sql.NVarChar(255), ctx.userId)
        .input("updatedBy", sql.NVarChar(255), ctx.userId)
        .query(
          `
          INSERT INTO financial_transactions (
            organization_id, branch_id,
            transaction_type, payable_id,
            transaction_date, payment_method, bank_account_id,
            original_amount, interest_amount, fine_amount, discount_amount,
            iof_amount, bank_fee_amount, other_fees_amount, net_amount,
            notes, document_number,
            created_at, updated_at, deleted_at,
            created_by, updated_by, version
          )
          OUTPUT INSERTED.id
          VALUES (
            @orgId, @branchId,
            'PAYMENT', @payableId,
            @txDate, @paymentMethod, @bankAccountId,
            @originalAmount, @interestAmount, @fineAmount, @discountAmount,
            @iofAmount, @bankFeeAmount, @otherFeesAmount, @netAmount,
            @notes, @documentNumber,
            GETDATE(), GETDATE(), NULL,
            @createdBy, @updatedBy, 1
          )
        `
        );

      const financialTransactionId = txInsert.recordset?.[0]?.id;

      // 3) Atualizar título a pagar
      await tx
        .request()
        .input("orgId", sql.Int, ctx.organizationId)
        .input("payableId", sql.Int, Math.trunc(payableId))
        .input("payDate", sql.DateTime2, paymentDt)
        .input("amountPaid", sql.Decimal(18, 2), netAmount)
        .input("interest", sql.Decimal(18, 2), interest)
        .input("fine", sql.Decimal(18, 2), fine)
        .input("discount", sql.Decimal(18, 2), discount)
        .query(
          `
          UPDATE accounts_payable
          SET
            status = 'PAID',
            pay_date = @payDate,
            amount_paid = @amountPaid,
            interest = @interest,
            fine = @fine,
            discount = @discount,
            updated_at = GETDATE()
          WHERE id = @payableId
            AND organization_id = @orgId
        `
        );

      let journalEntryId: number | null = null;

      // 4) Contabilização automática (opcional)
      if (autoPost) {
        const now = new Date();
        // IMPORTANTE: a coluna/param é VARCHAR(20). Evitar truncamento silencioso.
        // Formato: YYYYMM-PAY-XXXXXXXX (<= 19 chars)
        const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
        const entryNumber = `${yearMonth}-PAY-${String(payableId).slice(-8)}`;

        const entryInsert = await tx
          .request()
          .input("orgId", sql.BigInt, ctx.organizationId)
          .input("branchId", sql.BigInt, branchId)
          .input("entryNumber", sql.VarChar(20), entryNumber)
          .input("entryDate", sql.DateTime, paymentDt)
          .input("sourceId", sql.BigInt, Math.trunc(payableId))
          .input(
            "description",
            sql.VarChar(500),
            `Pagamento - ${payable.description || "Sem descrição"}`
          )
          .input("total", sql.Decimal(18, 2), netAmount)
          .input("postedBy", sql.NVarChar(255), ctx.userId)
          .input("createdBy", sql.NVarChar(255), ctx.userId)
          .input("updatedBy", sql.NVarChar(255), ctx.userId)
          .query(
            `
            INSERT INTO journal_entries (
              organization_id, branch_id,
              entry_number, entry_date,
              source_type, source_id,
              description,
              total_debit, total_credit,
              status,
              posted_at, posted_by,
              created_at, updated_at, deleted_at,
              created_by, updated_by, version
            )
            OUTPUT INSERTED.id
            VALUES (
              @orgId, @branchId,
              @entryNumber, @entryDate,
              'PAYMENT', @sourceId,
              @description,
              @total, @total,
              'POSTED',
              GETDATE(), @postedBy,
              GETDATE(), GETDATE(), NULL,
              @createdBy, @updatedBy, 1
            )
          `
          );

        journalEntryId = entryInsert.recordset?.[0]?.id ?? null;

        // Linhas do lançamento
        let lineNum = 1;
        const partnerId = payable.partner_id ?? payable.partnerId ?? null;

        // DÉBITO: Fornecedor
        await tx
          .request()
          .input("journalEntryId", sql.BigInt, journalEntryId)
          .input("orgId", sql.BigInt, ctx.organizationId)
          .input("lineNumber", sql.Int, lineNum++)
          .input("chartAccountId", sql.BigInt, 100)
          .input("debit", sql.Decimal(18, 2), originalAmount)
          .input("credit", sql.Decimal(18, 2), 0)
          .input("desc", sql.VarChar(500), "Fornecedor - Baixa de pagamento")
          .input("partnerId", sql.BigInt, partnerId)
          .query(
            `
            INSERT INTO journal_entry_lines (
              journal_entry_id, organization_id,
              line_number, chart_account_id,
              debit_amount, credit_amount,
              description, partner_id
            )
            VALUES (
              @journalEntryId, @orgId,
              @lineNumber, @chartAccountId,
              @debit, @credit,
              @desc, @partnerId
            )
          `
          );

        // DÉBITO: Juros
        if (interest > 0) {
          await tx
            .request()
            .input("journalEntryId", sql.BigInt, journalEntryId)
            .input("orgId", sql.BigInt, ctx.organizationId)
            .input("lineNumber", sql.Int, lineNum++)
            .input("chartAccountId", sql.BigInt, 300)
            .input("debit", sql.Decimal(18, 2), interest)
            .input("credit", sql.Decimal(18, 2), 0)
            .input("desc", sql.VarChar(500), "Juros de Atraso")
            .query(
              `
              INSERT INTO journal_entry_lines (
                journal_entry_id, organization_id,
                line_number, chart_account_id,
                debit_amount, credit_amount,
                description
              )
              VALUES (
                @journalEntryId, @orgId,
                @lineNumber, @chartAccountId,
                @debit, @credit,
                @desc
              )
            `
            );
        }

        // DÉBITO: Multa
        if (fine > 0) {
          await tx
            .request()
            .input("journalEntryId", sql.BigInt, journalEntryId)
            .input("orgId", sql.BigInt, ctx.organizationId)
            .input("lineNumber", sql.Int, lineNum++)
            .input("chartAccountId", sql.BigInt, 301)
            .input("debit", sql.Decimal(18, 2), fine)
            .input("credit", sql.Decimal(18, 2), 0)
            .input("desc", sql.VarChar(500), "Multa por Atraso")
            .query(
              `
              INSERT INTO journal_entry_lines (
                journal_entry_id, organization_id,
                line_number, chart_account_id,
                debit_amount, credit_amount,
                description
              )
              VALUES (
                @journalEntryId, @orgId,
                @lineNumber, @chartAccountId,
                @debit, @credit,
                @desc
              )
            `
            );
        }

        // DÉBITO: IOF
        if (iof > 0) {
          await tx
            .request()
            .input("journalEntryId", sql.BigInt, journalEntryId)
            .input("orgId", sql.BigInt, ctx.organizationId)
            .input("lineNumber", sql.Int, lineNum++)
            .input("chartAccountId", sql.BigInt, 302)
            .input("debit", sql.Decimal(18, 2), iof)
            .input("credit", sql.Decimal(18, 2), 0)
            .input("desc", sql.VarChar(500), "IOF")
            .query(
              `
              INSERT INTO journal_entry_lines (
                journal_entry_id, organization_id,
                line_number, chart_account_id,
                debit_amount, credit_amount,
                description
              )
              VALUES (
                @journalEntryId, @orgId,
                @lineNumber, @chartAccountId,
                @debit, @credit,
                @desc
              )
            `
            );
        }

        // DÉBITO: Tarifas
        if (bankFee > 0) {
          await tx
            .request()
            .input("journalEntryId", sql.BigInt, journalEntryId)
            .input("orgId", sql.BigInt, ctx.organizationId)
            .input("lineNumber", sql.Int, lineNum++)
            .input("chartAccountId", sql.BigInt, 303)
            .input("debit", sql.Decimal(18, 2), bankFee)
            .input("credit", sql.Decimal(18, 2), 0)
            .input("desc", sql.VarChar(500), "Tarifa Bancária")
            .query(
              `
              INSERT INTO journal_entry_lines (
                journal_entry_id, organization_id,
                line_number, chart_account_id,
                debit_amount, credit_amount,
                description
              )
              VALUES (
                @journalEntryId, @orgId,
                @lineNumber, @chartAccountId,
                @debit, @credit,
                @desc
              )
            `
            );
        }

        // DÉBITO: Outras despesas (otherFees)
        // Sem esta linha, o crédito do banco fica maior que os débitos (lançamento desbalanceado).
        if (otherFees > 0) {
          await tx
            .request()
            .input("journalEntryId", sql.BigInt, journalEntryId)
            .input("orgId", sql.BigInt, ctx.organizationId)
            .input("lineNumber", sql.Int, lineNum++)
            .input("chartAccountId", sql.BigInt, 304)
            .input("debit", sql.Decimal(18, 2), otherFees)
            .input("credit", sql.Decimal(18, 2), 0)
            .input("desc", sql.VarChar(500), "Outras Despesas (Pagamento)")
            .query(
              `
              INSERT INTO journal_entry_lines (
                journal_entry_id, organization_id,
                line_number, chart_account_id,
                debit_amount, credit_amount,
                description
              )
              VALUES (
                @journalEntryId, @orgId,
                @lineNumber, @chartAccountId,
                @debit, @credit,
                @desc
              )
            `
            );
        }

        // CRÉDITO: Banco
        await tx
          .request()
          .input("journalEntryId", sql.BigInt, journalEntryId)
          .input("orgId", sql.BigInt, ctx.organizationId)
          .input("lineNumber", sql.Int, lineNum++)
          .input("chartAccountId", sql.BigInt, 10)
          .input("debit", sql.Decimal(18, 2), 0)
          .input("credit", sql.Decimal(18, 2), netAmount)
          .input("desc", sql.VarChar(500), `Pagamento via ${paymentMethod}`)
          .query(
            `
            INSERT INTO journal_entry_lines (
              journal_entry_id, organization_id,
              line_number, chart_account_id,
              debit_amount, credit_amount,
              description
            )
            VALUES (
              @journalEntryId, @orgId,
              @lineNumber, @chartAccountId,
              @debit, @credit,
              @desc
            )
          `
          );

        // CRÉDITO: Desconto
        if (discount > 0) {
          await tx
            .request()
            .input("journalEntryId", sql.BigInt, journalEntryId)
            .input("orgId", sql.BigInt, ctx.organizationId)
            .input("lineNumber", sql.Int, lineNum++)
            .input("chartAccountId", sql.BigInt, 400)
            .input("debit", sql.Decimal(18, 2), 0)
            .input("credit", sql.Decimal(18, 2), discount)
            .input("desc", sql.VarChar(500), "Desconto Obtido")
            .query(
              `
              INSERT INTO journal_entry_lines (
                journal_entry_id, organization_id,
                line_number, chart_account_id,
                debit_amount, credit_amount,
                description
              )
              VALUES (
                @journalEntryId, @orgId,
                @lineNumber, @chartAccountId,
                @debit, @credit,
                @desc
              )
            `
            );
        }

        // Vincular transação financeira ao lançamento
        if (journalEntryId && financialTransactionId) {
          await tx
            .request()
            .input("ftId", sql.BigInt, financialTransactionId)
            .input("journalEntryId", sql.BigInt, journalEntryId)
            .query(
              `
              UPDATE financial_transactions
              SET journal_entry_id = @journalEntryId, updated_at = GETDATE()
              WHERE id = @ftId
            `
            );
        }

        // Vincular título a pagar ao lançamento (FK existe via migration admin)
        if (journalEntryId) {
          await tx
            .request()
            .input("orgId", sql.Int, ctx.organizationId)
            .input("payableId", sql.Int, Math.trunc(payableId))
            .input("journalEntryId", sql.BigInt, journalEntryId)
            .query(
              `
              UPDATE accounts_payable
              SET journal_entry_id = @journalEntryId, updated_at = GETDATE()
              WHERE id = @payableId AND organization_id = @orgId
            `
            );
        }
      }

      return {
        status: 200 as const,
        payload: {
          success: true,
          message: "Pagamento registrado com sucesso",
          payment: {
            originalAmount,
            interestAmount: interest,
            fineAmount: fine,
            discountAmount: discount,
            iofAmount: iof,
            bankFeeAmount: bankFee,
            otherFeesAmount: otherFees,
            netAmount,
          },
        },
      };
    });
    
    return NextResponse.json(result.payload, { status: result.status });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
