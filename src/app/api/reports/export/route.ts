import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getTenantContext } from "@/lib/auth/context";

export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const ctx = await getTenantContext();
    if (!ctx.isAdmin) {
      return NextResponse.json(
        { error: "Forbidden", message: "Apenas ADMIN pode exportar relatórios" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, format = 'csv', filters = {} } = body;

    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'wms_events':
        const events = await db.execute(
          sql`SELECT * FROM wms_billing_events WHERE organization_id = ${ctx.organizationId}`
        );
        data = events.recordset || events;
        filename = `wms_events_${Date.now()}`;
        break;

      case 'ciap':
        const ciap = await db.execute(
          sql`SELECT * FROM ciap_control WHERE organization_id = ${ctx.organizationId}`
        );
        data = ciap.recordset || ciap;
        filename = `ciap_${Date.now()}`;
        break;

      case 'esg':
        const esg = await db.execute(
          sql`SELECT * FROM carbon_emissions WHERE organization_id = ${ctx.organizationId}`
        );
        data = esg.recordset || esg;
        filename = `esg_emissions_${Date.now()}`;
        break;

      case 'claims':
        const claims = await db.execute(
          sql`SELECT * FROM claims_management WHERE organization_id = ${ctx.organizationId}`
        );
        data = claims.recordset || claims;
        filename = `claims_${Date.now()}`;
        break;
    }

    if (format === 'csv') {
      const csv = convertToCSV(data);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ];

  return csvRows.join('\n');
}












