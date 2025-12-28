import { db } from "@/lib/db";
import { sql, eq, and, isNull } from "drizzle-orm";
import {
  fiscalDocuments,
  fiscalDocumentItems,
  accountsPayable,
  accountsReceivable,
} from "@/lib/db/schema";

/**
 * 💰 FINANCIAL TITLE GENERATOR SERVICE
 * 
 * Serviço para gerar automaticamente títulos financeiros (Contas a Pagar/Receber)
 * baseado em documentos fiscais classificados.
 */

export interface TitleGenerationResult {
  success: boolean;
  titlesGenerated: number;
  totalAmount: number;
  titles: Array<{
    id: number;
    type: "PAYABLE" | "RECEIVABLE";
    amount: number;
  }>;
  error?: string;
}

/**
 * Gera Conta a Pagar a partir de NFe PURCHASE
 * 
 * @param fiscalDocumentId - ID do documento fiscal
 * @param userId - ID do usuário que está gerando
 * @returns Resultado da geração
 */
export async function generatePayableFromNFe(
  fiscalDocumentId: number,
  userId: string
): Promise<TitleGenerationResult> {
  try {
    // 1. Buscar documento fiscal
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, fiscalDocumentId),
          isNull(fiscalDocuments.deletedAt)
        )
      );

    if (!document) {
      throw new Error("Documento fiscal não encontrado");
    }

    // 2. Validar classificação
    if (document.fiscalClassification !== "PURCHASE") {
      throw new Error(
        `Documento classificado como ${document.fiscalClassification}. ` +
        `Apenas documentos PURCHASE geram Contas a Pagar.`
      );
    }

    // 3. Validar se já tem título gerado
    if (document.financialStatus !== "NO_TITLE") {
      throw new Error("Documento já possui título financeiro gerado");
    }

    // 4. Extrair data de vencimento do XML (se disponível)
    // TODO: Implementar extração de vencimento do XML
    const dueDate = document.issueDate; // Por enquanto, usa data de emissão

    // 5. Criar Conta a Pagar
    await db.execute(sql`
      INSERT INTO accounts_payable (
        organization_id,
        branch_id,
        partner_id,
        fiscal_document_id,
        description,
        document_number,
        issue_date,
        due_date,
        amount,
        amount_paid,
        discount,
        interest,
        fine,
        status,
        origin,
        created_by,
        updated_by,
        created_at,
        updated_at,
        version
      ) VALUES (
        ${document.organizationId},
        ${document.branchId},
        ${document.partnerId},
        ${fiscalDocumentId},
        'NFe ' + ${document.documentNumber} + ' - ' + ${document.partnerName},
        ${document.documentNumber},
        ${document.issueDate},
        ${dueDate},
        ${document.netAmount},
        0.00,
        0.00,
        0.00,
        0.00,
        'OPEN',
        'FISCAL_NFE',
        ${userId},
        ${userId},
        GETDATE(),
        GETDATE(),
        1
      )
    `);

    // 6. Buscar ID da conta criada
    const createdPayable = await db.execute(sql`
      SELECT TOP 1 id, amount
      FROM accounts_payable
      WHERE fiscal_document_id = ${fiscalDocumentId}
      ORDER BY id DESC
    `);

    const payableId = createdPayable.recordset[0].id;
    const amount = parseFloat(createdPayable.recordset[0].amount);

    // 7. Atualizar status do documento fiscal
    await db
      .update(fiscalDocuments)
      .set({
        financialStatus: "GENERATED",
        updatedAt: new Date(),
      })
      .where(eq(fiscalDocuments.id, fiscalDocumentId));

    console.log(`✅ Conta a Pagar #${payableId} gerada - R$ ${amount.toFixed(2)}`);

    return {
      success: true,
      titlesGenerated: 1,
      totalAmount: amount,
      titles: [
        {
          id: payableId,
          type: "PAYABLE",
          amount,
        },
      ],
    };
  } catch (error: any) {
    console.error("❌ Erro ao gerar Conta a Pagar:", error);
    return {
      success: false,
      titlesGenerated: 0,
      totalAmount: 0,
      titles: [],
      error: error.message,
    };
  }
}

/**
 * Gera Conta a Receber a partir de CTe ou NFe CARGO
 * 
 * @param fiscalDocumentId - ID do documento fiscal
 * @param userId - ID do usuário que está gerando
 * @returns Resultado da geração
 */
export async function generateReceivableFromCTe(
  fiscalDocumentId: number,
  userId: string
): Promise<TitleGenerationResult> {
  try {
    // 1. Buscar documento fiscal
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(
        and(
          eq(fiscalDocuments.id, fiscalDocumentId),
          isNull(fiscalDocuments.deletedAt)
        )
      );

    if (!document) {
      throw new Error("Documento fiscal não encontrado");
    }

    // 2. Validar classificação
    if (document.fiscalClassification !== "CARGO" && document.documentType !== "CTE") {
      throw new Error(
        `Documento classificado como ${document.fiscalClassification}. ` +
        `Apenas documentos CARGO ou CTe geram Contas a Receber.`
      );
    }

    // 3. Validar se já tem título gerado
    if (document.financialStatus !== "NO_TITLE") {
      throw new Error("Documento já possui título financeiro gerado");
    }

    // 4. Criar Conta a Receber
    await db.execute(sql`
      INSERT INTO accounts_receivable (
        organization_id,
        branch_id,
        partner_id,
        fiscal_document_id,
        description,
        document_number,
        issue_date,
        due_date,
        amount,
        amount_received,
        discount,
        interest,
        fine,
        status,
        origin,
        created_by,
        updated_by,
        created_at,
        updated_at,
        version
      ) VALUES (
        ${document.organizationId},
        ${document.branchId},
        ${document.partnerId},
        ${fiscalDocumentId},
        ${document.documentType} + ' ' + ${document.documentNumber} + ' - ' + ${document.partnerName},
        ${document.documentNumber},
        ${document.issueDate},
        ${document.issueDate}, -- TODO: calcular vencimento
        ${document.netAmount},
        0.00,
        0.00,
        0.00,
        0.00,
        'OPEN',
        'FISCAL_CTE',
        ${userId},
        ${userId},
        GETDATE(),
        GETDATE(),
        1
      )
    `);

    // 5. Buscar ID da conta criada
    const createdReceivable = await db.execute(sql`
      SELECT TOP 1 id, amount
      FROM accounts_receivable
      WHERE fiscal_document_id = ${fiscalDocumentId}
      ORDER BY id DESC
    `);

    const receivableId = createdReceivable.recordset[0].id;
    const amount = parseFloat(createdReceivable.recordset[0].amount);

    // 6. Atualizar status do documento fiscal
    await db
      .update(fiscalDocuments)
      .set({
        financialStatus: "GENERATED",
        updatedAt: new Date(),
      })
      .where(eq(fiscalDocuments.id, fiscalDocumentId));

    console.log(`✅ Conta a Receber #${receivableId} gerada - R$ ${amount.toFixed(2)}`);

    return {
      success: true,
      titlesGenerated: 1,
      totalAmount: amount,
      titles: [
        {
          id: receivableId,
          type: "RECEIVABLE",
          amount,
        },
      ],
    };
  } catch (error: any) {
    console.error("❌ Erro ao gerar Conta a Receber:", error);
    return {
      success: false,
      titlesGenerated: 0,
      totalAmount: 0,
      titles: [],
      error: error.message,
    };
  }
}

/**
 * Reverte geração de títulos (híbrido - reversível)
 * 
 * @param fiscalDocumentId - ID do documento fiscal
 * @returns Sucesso ou erro
 */
export async function reverseTitles(
  fiscalDocumentId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Buscar documento
    const [document] = await db
      .select()
      .from(fiscalDocuments)
      .where(eq(fiscalDocuments.id, fiscalDocumentId));

    if (!document) {
      throw new Error("Documento não encontrado");
    }

    // 2. Validar se tem títulos gerados
    if (document.financialStatus === "NO_TITLE") {
      throw new Error("Documento não possui títulos gerados");
    }

    // 3. Verificar se títulos já foram pagos
    const paidPayable = await db.execute(sql`
      SELECT id FROM accounts_payable
      WHERE fiscal_document_id = ${fiscalDocumentId}
      AND status IN ('PAID', 'PARTIAL')
    `);

    const paidReceivable = await db.execute(sql`
      SELECT id FROM accounts_receivable
      WHERE fiscal_document_id = ${fiscalDocumentId}
      AND status IN ('RECEIVED', 'PARTIAL')
    `);

    if (paidPayable.recordset.length > 0 || paidReceivable.recordset.length > 0) {
      throw new Error("Não é possível reverter títulos já pagos ou recebidos");
    }

    // 4. Deletar títulos (soft delete)
    await db.execute(sql`
      UPDATE accounts_payable
      SET deleted_at = GETDATE()
      WHERE fiscal_document_id = ${fiscalDocumentId}
      AND deleted_at IS NULL
    `);

    await db.execute(sql`
      UPDATE accounts_receivable
      SET deleted_at = GETDATE()
      WHERE fiscal_document_id = ${fiscalDocumentId}
      AND deleted_at IS NULL
    `);

    // 5. Atualizar status do documento
    await db
      .update(fiscalDocuments)
      .set({
        financialStatus: "NO_TITLE",
        updatedAt: new Date(),
      })
      .where(eq(fiscalDocuments.id, fiscalDocumentId));

    console.log(`✅ Títulos do documento #${fiscalDocumentId} revertidos`);

    return { success: true };
  } catch (error: any) {
    console.error("❌ Erro ao reverter títulos:", error);
    return { success: false, error: error.message };
  }
}























