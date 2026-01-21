import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Interface para resultado da matriz fiscal
interface TaxMatrixResult {
  cst_code: string;
  cst_description: string;
  icms_rate: number;
  fcp_rate: number;
  difal_applicable: number;
  legal_basis: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId = 1, ufOrigin, ufDestination, cargoType = 'GERAL', isContributor = true, baseValue } = body;

    // Buscar regra na matriz
    const result = await db.execute(sql`
      SELECT TOP 1
        cst_code, cst_description, icms_rate, fcp_rate, 
        difal_applicable, legal_basis
      FROM fiscal_tax_matrix
      WHERE organization_id = ${organizationId}
        AND uf_origin = ${ufOrigin}
        AND uf_destination = ${ufDestination}
        AND cargo_type = ${cargoType}
        AND is_icms_contributor = ${isContributor ? 1 : 0}
        AND is_active = 1
    `);

    const data = (result.recordset || result) as unknown as TaxMatrixResult[];
    const rule = data[0];

    if (!rule) {
      return NextResponse.json({
        success: false,
        error: "Nenhuma regra encontrada para esta rota",
        suggestion: "Cadastre uma regra fiscal para esta combinação de UF/Carga"
      }, { status: 404 });
    }

    const icmsValue = baseValue * (rule.icms_rate / 100);
    const fcpValue = baseValue * (rule.fcp_rate / 100);
    const totalTax = icmsValue + fcpValue;

    // Log da validação
    await db.execute(sql`
      INSERT INTO fiscal_validation_log 
        (organization_id, document_type, validation_type, validation_status, 
         uf_origin, uf_destination, cargo_type, rule_found, 
         icms_rate_applied, fcp_rate_applied, cst_applied)
      VALUES 
        (${organizationId}, 'SIMULATION', 'TAX_CALC', 'SUCCESS',
         ${ufOrigin}, ${ufDestination}, ${cargoType}, 1,
         ${rule.icms_rate}, ${rule.fcp_rate}, ${rule.cst_code})
    `);

    return NextResponse.json({
      success: true,
      result: {
        found: true,
        rule: rule.cst_description || 'Tributação Padrão',
        cst: rule.cst_code,
        icms: rule.icms_rate,
        icmsValue,
        fcp: rule.fcp_rate,
        fcpValue,
        difal: rule.difal_applicable === 1,
        totalTax,
        legal: rule.legal_basis
      }
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}













