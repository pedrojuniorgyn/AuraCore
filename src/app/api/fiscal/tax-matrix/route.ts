import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";
import { CreateTaxMatrixRuleSchema, ListTaxMatrixQuerySchema } from "@/modules/fiscal/presentation/validators";

/**
 * GET /api/fiscal/tax-matrix
 * Lista regras da matriz tributária
 * 
 * Multi-tenancy: ✅ organizationId
 * Validação: ✅ Zod query params
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;

    // Validar query params com Zod
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = ListTaxMatrixQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetros inválidos",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { ufOrigin, ufDestination, cargoType, isActive } = validation.data;

    const matrix = await db.execute(sql`
      SELECT 
        id,
        CONCAT(uf_origin, ' → ', uf_destination) as route,
        cargo_type as cargo,
        CASE WHEN is_icms_contributor = 1 THEN 'Sim' ELSE 'Não' END as contributor,
        cst_code as cst,
        icms_rate as icms,
        fcp_rate as fcp,
        CASE WHEN difal_applicable = 1 THEN 'Sim' ELSE 'Não' END as difal,
        legal_basis as legal
      FROM fiscal_tax_matrix
      WHERE organization_id = ${organizationId}
        AND is_active = 1
      ORDER BY uf_origin, uf_destination
    `);

    return NextResponse.json({
      success: true,
      data: matrix.recordset || matrix
    });
  } catch (error: unknown) {
    // Propagar erros de auth
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

/**
 * POST /api/fiscal/tax-matrix
 * Cria nova regra na matriz tributária
 * 
 * Multi-tenancy: ✅ organizationId
 * Validação: ✅ Zod schema
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext();
    const organizationId = ctx.organizationId;

    const body = await request.json();

    // Validar body com Zod
    const validation = CreateTaxMatrixRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados inválidos",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      ufOrigin,
      ufDestination,
      cargoType,
      isContributor,
      cstCode,
      icmsRate,
      fcpRate,
      difalApplicable,
      legalBasis,
    } = validation.data;

    await db.execute(sql`
      INSERT INTO fiscal_tax_matrix 
        (organization_id, uf_origin, uf_destination, cargo_type, is_icms_contributor, cst_code, icms_rate, fcp_rate, difal_applicable, legal_basis, is_active)
      VALUES 
        (${organizationId}, ${ufOrigin}, ${ufDestination}, ${cargoType}, ${isContributor ? 1 : 0}, ${cstCode}, ${icmsRate}, ${fcpRate}, ${difalApplicable ? 1 : 0}, ${legalBasis || null}, 1)
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Regra fiscal criada"
    });
  } catch (error: unknown) {
    // Propagar erros de auth
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
