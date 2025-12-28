// @ts-ignore - ofx-js não tem tipos disponíveis
import { parse as parseOfx } from "ofx-js";
import sql from "mssql";
import { ensureConnection, pool } from "@/lib/db";

function normalizeDtPosted(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  const m = s.match(/^(\d{8})/);
  if (!m) return null;
  const y = m[1].slice(0, 4);
  const mo = m[1].slice(4, 6);
  const d = m[1].slice(6, 8);
  return `${y}-${mo}-${d}T00:00:00.000Z`;
}

function coerceArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export type OfxTransaction = {
  date: string;
  description: string;
  amount: number;
  type: string;
};

export async function parseOFXContent(content: string): Promise<OfxTransaction[]> {
  const parsed = await parseOfx(content);
  const ofx = (parsed as any)?.OFX ?? (parsed as any);

  // Banco (conta corrente) ou cartão
  const stmtTrnRs = (ofx?.BANKMSGSRSV1?.STMTTRNRS ?? ofx?.CREDITCARDMSGSRSV1?.CCSTMTTRNRS) as any;
  const stmtrs =
    (Array.isArray(stmtTrnRs) ? stmtTrnRs[0] : stmtTrnRs)?.STMTRS ??
    (Array.isArray(stmtTrnRs) ? stmtTrnRs[0] : stmtTrnRs)?.CCSTMTRS;
  const banktranlist = stmtrs?.BANKTRANLIST;
  const stmttrn = banktranlist?.STMTTRN;

  const rows = coerceArray<any>(stmttrn);
  const out: OfxTransaction[] = [];

  for (const t of rows) {
    const dateIso = normalizeDtPosted(t?.DTPOSTED);
    const amount = Number(t?.TRNAMT);
    if (!dateIso || !Number.isFinite(amount)) continue;

    const description = String(t?.MEMO ?? t?.NAME ?? "").trim();
    const type = String(t?.TRNTYPE ?? "UNKNOWN").trim();
    out.push({ date: dateIso, description, amount, type });
  }

  return out;
}

export async function importOfxToBankTransactions(args: {
  organizationId: number;
  userId: string;
  bankAccountId: number;
  content: string;
}): Promise<{ inserted: number; skipped: number; parsed: number }> {
  const transactions = await parseOFXContent(args.content);
  await ensureConnection();

  // Validar conta bancária pertence ao tenant
  const bankAccountCheck = await pool
    .request()
    .input("orgId", sql.Int, args.organizationId)
    .input("bankAccountId", sql.Int, Math.trunc(args.bankAccountId))
    .query(
      `
        SELECT TOP 1 id
        FROM bank_accounts
        WHERE id = @bankAccountId
          AND organization_id = @orgId
          AND deleted_at IS NULL
      `
    );

  if (!bankAccountCheck.recordset?.length) {
    throw new Error("Conta bancária não encontrada");
  }

  let insertedCount = 0;
  let skippedCount = 0;
  for (const tx of transactions) {
    const amount = Number(tx.amount);
    if (!tx.date || !Number.isFinite(amount)) {
      skippedCount++;
      continue;
    }

    // Evita duplicar transações já importadas (heurística simples)
    const exists = await pool
      .request()
      .input("orgId", sql.Int, args.organizationId)
      .input("bankAccountId", sql.Int, Math.trunc(args.bankAccountId))
      .input("txDate", sql.DateTime2, new Date(tx.date))
      .input("description", sql.NVarChar(500), String(tx.description ?? ""))
      .input("amount", sql.Decimal(18, 2), amount)
      .query(
        `
          SELECT TOP 1 id
          FROM bank_transactions
          WHERE organization_id = @orgId
            AND bank_account_id = @bankAccountId
            AND transaction_date = @txDate
            AND amount = @amount
            AND ISNULL(description, '') = ISNULL(@description, '')
        `
      );

    if (exists.recordset?.length) {
      skippedCount++;
      continue;
    }

    await pool
      .request()
      .input("orgId", sql.Int, args.organizationId)
      .input("bankAccountId", sql.Int, Math.trunc(args.bankAccountId))
      .input("txDate", sql.DateTime2, new Date(tx.date))
      .input("description", sql.NVarChar(500), String(tx.description ?? ""))
      .input("amount", sql.Decimal(18, 2), amount)
      .input("type", sql.NVarChar(50), String(tx.type ?? "UNKNOWN"))
      .input("createdBy", sql.NVarChar(255), String(args.userId))
      .query(
        `
          INSERT INTO bank_transactions (
            organization_id, bank_account_id, transaction_date,
            description, amount, transaction_type,
            created_by, created_at
          ) VALUES (
            @orgId, @bankAccountId, @txDate,
            @description, @amount, @type,
            @createdBy, GETDATE()
          )
        `
      );

    insertedCount++;
  }

  return { inserted: insertedCount, skipped: skippedCount, parsed: transactions.length };
}

