import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTenantContext } from "@/lib/auth/context";
import { ensureConnection } from "@/lib/db";
import sql from "mssql";

export const dynamic = "force-dynamic";

/**
 * GET /api/pcg-ncm-rules/[id]
 * Busca uma regra específica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureConnection();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { organizationId } = getTenantContext();
    const pool = await ensureConnection();

    const result = await pool
      .request()
      .input("id", sql.Int, parseInt(params.id))
      .input("organizationId", sql.Int, organizationId)
      .query(`
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
        WHERE r.id = @id
          AND r.organization_id = @organizationId
          AND r.deleted_at IS NULL
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.recordset[0],
    });
  } catch (error: any) {
    console.error("Erro ao buscar regra:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao buscar regra" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/pcg-ncm-rules/[id]
 * Atualiza uma regra
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureConnection();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { organizationId, userId } = getTenantContext();
    const body = await request.json();
    const pool = await ensureConnection();

    // Verificar se existe
    const existing = await pool
      .request()
      .input("id", sql.Int, parseInt(params.id))
      .input("organizationId", sql.Int, organizationId)
      .query(`
        SELECT id, version FROM pcg_ncm_rules
        WHERE id = @id
          AND organization_id = @organizationId
          AND deleted_at IS NULL
      `);

    if (existing.recordset.length === 0) {
      return NextResponse.json({ error: "Regra não encontrada" }, { status: 404 });
    }

    // Atualizar
    await pool
      .request()
      .input("id", sql.Int, parseInt(params.id))
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
      .input("updatedBy", sql.NVarChar, userId)
      .input("version", sql.Int, existing.recordset[0].version)
      .query(`
        UPDATE pcg_ncm_rules
        SET
          pcg_id = @pcgId,
          ncm_code = @ncmCode,
          ncm_description = @ncmDescription,
          flag_pis_cofins_monofasico = @flagPisCofinsMono,
          flag_icms_st = @flagIcmsSt,
          flag_icms_diferimento = @flagIcmsDif,
          flag_ipi_suspenso = @flagIpiSuspenso,
          flag_importacao = @flagImportacao,
          priority = @priority,
          updated_by = @updatedBy,
          updated_at = GETDATE(),
          version = version + 1
        WHERE id = @id
          AND organization_id = @organizationId
          AND version = @version
      `);

    return NextResponse.json({
      success: true,
      message: "Regra atualizada com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao atualizar regra:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar regra" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pcg-ncm-rules/[id]
 * Deleta (soft delete) uma regra
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ensureConnection();
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { organizationId, userId } = getTenantContext();
    const pool = await ensureConnection();

    await pool
      .request()
      .input("id", sql.Int, parseInt(params.id))
      .input("organizationId", sql.Int, organizationId)
      .input("deletedBy", sql.NVarChar, userId)
      .query(`
        UPDATE pcg_ncm_rules
        SET
          deleted_at = GETDATE(),
          updated_by = @deletedBy,
          updated_at = GETDATE()
        WHERE id = @id
          AND organization_id = @organizationId
          AND deleted_at IS NULL
      `);

    return NextResponse.json({
      success: true,
      message: "Regra excluída com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao excluir regra:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao excluir regra" },
      { status: 500 }
    );
  }
}
