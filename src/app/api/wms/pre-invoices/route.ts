/**
 * API Routes: /api/wms/pre-invoices
 * 
 * ⚠️ S1.1 Batch 3 Phase 2: Zod validation added
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { withDI } from '@/shared/infrastructure/di/with-di';

// ✅ S1.1 Batch 3 Phase 2: Schemas
const queryPreInvoicesSchema = z.object({
  organizationId: z.coerce.number().int().positive().optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'ISSUED', 'CANCELLED']).optional(),
});

const createPreInvoiceSchema = z.object({
  organizationId: z.number().int().positive().default(1),
  customerId: z.string().min(1, 'ID do cliente obrigatório'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Período deve estar no formato YYYY-MM'),
  subtotal: z.number().nonnegative('Subtotal deve ser não-negativo'),
});

export const GET = withDI(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // ✅ S1.1 Batch 3 Phase 2: Validate query params
    const validation = queryPreInvoicesSchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { organizationId = 1 } = validation.data;

    const invoices = await db.execute(sql`
      SELECT 
        id, billing_period as period, customer_id, 
        subtotal, iss_amount as iss, net_amount as total, status
      FROM wms_pre_invoices
      WHERE organization_id = ${organizationId}
      ORDER BY billing_period DESC
    `);

    return NextResponse.json({
      success: true,
      data: invoices.recordset || invoices
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // ✅ S1.1 Batch 3 Phase 2: Validate body
    const validation = createPreInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { organizationId = 1, customerId, period, subtotal } = validation.data;

    const issAmount = subtotal * 0.05;
    const netAmount = subtotal - issAmount;

    await db.execute(sql`
      INSERT INTO wms_pre_invoices 
        (organization_id, customer_id, billing_period, measurement_date, subtotal, iss_rate, iss_amount, net_amount, status)
      VALUES 
        (${organizationId}, ${customerId}, ${period}, GETDATE(), ${subtotal}, 5.00, ${issAmount}, ${netAmount}, 'DRAFT')
    `);

    return NextResponse.json({ success: true, message: "Pré-fatura gerada" });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
});






























