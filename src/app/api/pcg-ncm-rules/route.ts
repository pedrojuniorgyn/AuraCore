import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/auth/context";
import { ensureConnection } from "@/lib/db";
import sql from "mssql";

export const dynamic = "force-dynamic";

/**
 * GET /api/pcg-ncm-rules
 * Lista todas as regras PCG-NCM
 */
export async function GET(request: NextRequest) {
  try {
    await ensureConnection();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { organizationId } = getTenantContext();
    const { searchParams } = new URL(request.url);
    const pcgId = searchParams.get("pcg_id");

    let query = `
      SELECT 
        r.id,
        r.ncm_code as ncmCode,
        r.ncm_description as ncmDescription,
        r.pcg_id as pcgId,
        r.flag_pis_cofins_monofasico as flagPisCofinsMono,
        r.flag_icms_st as flagIcmsSt,
        r.flag_icms_diferimento as flagIcmsDif,
        r.flag_ipi_suspenso as flagIpiSuspenso,
        r.flag_importacao as flagImportacao,
        r.priority,
        r.is_active as isActive,
        r.created_at as createdAt,
        p.code as pcgCode,
        p.name as pcgName
      FROM pcg_ncm_rules r
      LEFT JOIN management_chart_of_accounts p ON r.pcg_id = p.id
      WHERE r.organization_id = @organizationId
        AND r.deleted_at IS NULL
    `;

    if (pcgId) {
      query += ` AND r.pcg_id = @pcgId`;
    }

    query += ` ORDER BY r.priority ASC, r.ncm_code ASC`;

    const pool = await ensureConnection();
    const result = await pool
      .request()
      .input("organizationId", sql.Int, organizationId)
      .input("pcgId", sql.Int, pcgId ? parseInt(pcgId) : null)
      .query(query);

    return NextResponse.json({
      success: true,
      data: result.recordset,
      total: result.recordset.length,
    });
  } catch (error: any) {
    console.error("Erro ao buscar regras PCG-NCM:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar regras" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pcg-ncm-rules
 * Cria uma nova regra PCG-NCM
 */
export async function POST(request: NextRequest) {
  try {
    await ensureConnection();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { organizationId, userId } = await getTenantContext();
    const body = await request.json();

    // Validações
    if (!body.ncmCode || !body.pcgId) {
      return NextResponse.json(
        { error: "NCM e PCG são obrigatórios" },
        { status: 400 }
      );
    }

    // ✅ FIX: Remover verificação duplicada para evitar race condition
    // O banco já tem constraint UNIQUE em (organization_id, ncm_code)
    // Deixar o banco tratar e capturar o erro adequadamente
    
    const pool = await ensureConnection();

    try {
      // Inserir diretamente, sem verificação prévia
      await pool
        .request()
        .input("organizationId", sql.Int, organizationId)
        .input("pcgId", sql.Int, body.pcgId)
        .input("ncmCode", sql.NVarChar, body.ncmCode)
        .input("ncmDescription", sql.NVarChar, body.ncmDescription || null)
        .input("flagPisCofinsMono", sql.Bit, body.flagPisCofinsMono ? 1 : 0)
        .input("flagIcmsSt", sql.Bit, body.flagIcmsSt ? 1 : 0)
        .input("flagIcmsDif", sql.Bit, body.flagIcmsDif ? 1 : 0)
        .input("flagIpiSuspenso", sql.Bit, body.flagIpiSuspenso ? 1 : 0)
        .input("flagImportacao", sql.Bit, body.flagImportacao ? 1 : 0)
        .input("priority", sql.Int, body.priority || 100)
        .input("createdBy", sql.NVarChar, userId)
        .query(`
          INSERT INTO pcg_ncm_rules (
            organization_id, pcg_id, ncm_code, ncm_description,
            flag_pis_cofins_monofasico, flag_icms_st, flag_icms_diferimento,
            flag_ipi_suspenso, flag_importacao, priority, is_active,
            created_by, created_at, updated_at, version
          )
          VALUES (
            @organizationId, @pcgId, @ncmCode, @ncmDescription,
            @flagPisCofinsMono, @flagIcmsSt, @flagIcmsDif,
            @flagIpiSuspenso, @flagImportacao, @priority, 1,
            @createdBy, GETDATE(), GETDATE(), 1
          )
        `);

      return NextResponse.json({
        success: true,
        message: "Regra criada com sucesso",
      });
    } catch (dbError: any) {
      // Capturar erro de violação de constraint UNIQUE
      if (dbError.number === 2627 || dbError.message?.includes('duplicate') || dbError.message?.includes('UNIQUE')) {
        return NextResponse.json(
          { error: "Já existe uma regra para este NCM" },
          { status: 400 }
        );
      }
      // Re-lançar outros erros
      throw dbError;
    }
  } catch (error: any) {
    console.error("Erro ao criar regra:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao criar regra" },
      { status: 500 }
    );
  }
}