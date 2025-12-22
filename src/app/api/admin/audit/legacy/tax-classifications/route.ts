import { NextRequest, NextResponse } from "next/server";
import { getAuditLegacyPool } from "@/lib/audit/db";
import { withPermission } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

type Item = { value: string; label: string };

const CANDIDATE_COLUMNS = [
  "c_class_trib",
  "cclasstrib",
  "class_trib",
  "classificacao_tributaria",
] as const;

async function listLegacyTaxClassifications(req: Request) {
  const debugRequested = req.headers.get("x-audit-debug") === "1";
  const isProd = process.env.NODE_ENV === "production";

  try {
    const legacy = await getAuditLegacyPool();

    // Descobre uma coluna plausível em dbo.empresa_filial, sem "adivinhar" schema.
    const colRes = await legacy.request().query(`
      SELECT TOP 1 LOWER(c.name) as col
      FROM sys.columns c
      INNER JOIN sys.objects o ON o.object_id = c.object_id
      INNER JOIN sys.schemas s ON s.schema_id = o.schema_id
      WHERE s.name = 'dbo'
        AND o.name = 'empresa_filial'
        AND LOWER(c.name) IN (${CANDIDATE_COLUMNS.map((c) => `'${c}'`).join(", ")});
    `);
    const col = (colRes.recordset?.[0] as any)?.col ? String((colRes.recordset?.[0] as any).col) : null;

    if (!col || !CANDIDATE_COLUMNS.includes(col as any)) {
      // Não sabemos onde está no legado (varia por versão). Retorna vazio, sem quebrar a UI.
      return NextResponse.json({ success: true, items: [] as Item[] });
    }

    // Segurança: usamos QUOTENAME no SQL para evitar injection por nome de coluna.
    const r = await legacy.request().query(`
      DECLARE @col sysname = '${col}';
      DECLARE @sql nvarchar(max) =
        N'SELECT DISTINCT TOP (200) ' +
        N'  CAST(' + QUOTENAME(@col) + N' as nvarchar(50)) as value ' +
        N'FROM dbo.empresa_filial ' +
        N'WHERE ' + QUOTENAME(@col) + N' IS NOT NULL ' +
        N'  AND LTRIM(RTRIM(CAST(' + QUOTENAME(@col) + N' as nvarchar(50)))) <> '''' ' +
        N'ORDER BY value;';
      EXEC sp_executesql @sql;
    `);

    const items: Item[] = (r.recordset ?? []).map((row: any) => {
      const v = String(row.value ?? "").trim();
      return { value: v, label: v };
    });

    return NextResponse.json({ success: true, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno desconhecido";
    return NextResponse.json(
      { error: "Falha ao listar classificações tributárias (legado)", ...(isProd && !debugRequested ? {} : { debug: { message } }) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Token (automação) OU sessão com permissão (RBAC)
  const token = process.env.AUDIT_SNAPSHOT_HTTP_TOKEN;
  const headerToken = req.headers.get("x-audit-token");
  const tokenOk = token && headerToken && headerToken === token;
  if (tokenOk) return listLegacyTaxClassifications(req);

  return withPermission(req, "admin.users.manage", async () => {
    return listLegacyTaxClassifications(req);
  });
}

