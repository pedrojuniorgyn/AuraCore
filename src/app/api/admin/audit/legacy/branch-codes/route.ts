import { NextRequest, NextResponse } from "next/server";
import { getAuditLegacyPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

type Item = { code: number; label: string; companyCode?: number | null };

async function listLegacyBranchCodes(req: Request) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";
  const isProd = process.env.NODE_ENV === "production";

  try {
    const legacy = await getAuditLegacyPool();

    // Usa tabelas que já existem no ETL (snapshotRun.ts)
    const r = await legacy.request().query(`
      SELECT TOP (500)
        CAST(ef.codigo_empresa_filial as int) as code,
        CAST(ef.codigo_empresa as int) as company_code,
        CAST(e.descricao as nvarchar(255)) as company_name
      FROM dbo.empresa_filial ef
      LEFT JOIN dbo.empresa e ON e.codigo_empresa = ef.codigo_empresa
      ORDER BY ef.codigo_empresa_filial;
    `);

    const items: Item[] = (r.recordset ?? []).map((row: any) => {
      const code = Number(row.code);
      const companyCode = row.company_code == null ? null : Number(row.company_code);
      const companyName = row.company_name ? String(row.company_name).trim() : "";
      const label = companyName ? `${code} — ${companyName}` : String(code);
      return { code, label, companyCode };
    });

    return NextResponse.json({ success: true, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha ao listar códigos de filial (legado)", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Token (automação) OU sessão com permissão (RBAC)
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");
  const tokenOk = token && headerToken && headerToken === token;
  if (tokenOk) return listLegacyBranchCodes(req);

  return withPermission(req, "admin.users.manage", async () => {
    return listLegacyBranchCodes(req);
  });
}

