import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// ✅ S1.1 Batch 3 Phase 2: Schemas inline para billing-events
const createBillingEventSchema = z.object({
  organizationId: z.number().int().positive().default(1),
  customerId: z.string().uuid('ID do cliente inválido'),
  eventType: z.enum(['STORAGE', 'HANDLING', 'PICKING', 'PACKING', 'SHIPPING', 'ADDITIONAL_SERVICE']),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unitPrice: z.number().nonnegative('Preço unitário deve ser não-negativo'),
  unitOfMeasure: z.string().default('UN'),
});

const queryBillingEventsSchema = z.object({
  organizationId: z.coerce.number().int().positive().optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Período deve estar no formato YYYY-MM').optional(),
  status: z.enum(['PENDING', 'INVOICED', 'PAID', 'CANCELLED']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // ✅ S1.1 Batch 3 Phase 2: Validar query params
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = queryBillingEventsSchema.safeParse(queryParams);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parâmetros inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const { organizationId = "1", period, status } = validation.data;

    const events = await db.execute(sql`
      SELECT 
        id,
        customer_id,
        event_type,
        event_date,
        quantity,
        unit_of_measure as unit,
        unit_price,
        subtotal,
        billing_status as status
      FROM wms_billing_events
      WHERE organization_id = ${organizationId}
        ${period ? sql`AND billing_period = ${period}` : sql``}
      ORDER BY event_date DESC
    `);

    return NextResponse.json({
      success: true,
      data: events.recordset || events
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // ✅ S1.1 Batch 3 Phase 2: Validar body com Zod
    const validation = createBillingEventSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    
    const { 
      organizationId = 1, 
      customerId, 
      eventType, 
      quantity, 
      unitPrice,
      unitOfMeasure = 'UN'
    } = validation.data;

    await db.execute(sql`
      INSERT INTO wms_billing_events 
        (organization_id, customer_id, event_type, event_date, quantity, unit_of_measure, unit_price, subtotal, billing_status)
      VALUES 
        (${organizationId}, ${customerId}, ${eventType}, GETDATE(), ${quantity}, 'UN', ${unitPrice}, ${quantity * unitPrice}, 'PENDING')
    `);

    return NextResponse.json({
      success: true,
      message: "Evento registrado com sucesso"
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
}






























