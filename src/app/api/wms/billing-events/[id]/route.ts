/**
 * API Routes: /api/wms/billing-events/[id]
 * 
 * ⚠️ S1.1 Batch 3 Phase 2: Zod validation added
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { withDI, type RouteContext } from '@/shared/infrastructure/di/with-di';

// ✅ S1.1 Batch 3 Phase 2: Schemas
const idParamSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)).refine((val) => !isNaN(val) && val > 0, { message: 'ID inválido' }),
});

const updateBillingEventSchema = z.object({
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unitPrice: z.number().nonnegative('Preço unitário deve ser não-negativo'),
  notes: z.string().max(500).optional(),
});

export const PUT = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    
    // ✅ S1.1 Batch 3 Phase 2: Validate ID
    const idValidation = idParamSchema.safeParse(resolvedParams);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: 'ID inválido', details: idValidation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // ✅ S1.1 Batch 3 Phase 2: Validate body
    const validation = updateBillingEventSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { quantity, unitPrice, notes } = validation.data;
    const subtotal = quantity * unitPrice;

    await db.execute(sql`
      UPDATE wms_billing_events 
      SET quantity = ${quantity},
          unit_price = ${unitPrice},
          subtotal = ${subtotal},
          notes = ${notes || ''}
      WHERE id = ${resolvedParams.id}
    `);

    return NextResponse.json({
      success: true,
      message: "Evento atualizado com sucesso"
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
});

export const DELETE = withDI(async (
  request: NextRequest,
  context: RouteContext
) => {
  try {
    const resolvedParams = await context.params;
    
    // ✅ S1.1 Batch 3 Phase 2: Validate ID
    const validation = idParamSchema.safeParse(resolvedParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'ID inválido', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    await db.execute(sql`
      DELETE FROM wms_billing_events 
      WHERE id = ${resolvedParams.id}
        AND billing_status = 'PENDING'
    `);

    return NextResponse.json({
      success: true,
      message: "Evento excluído com sucesso"
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
});






























