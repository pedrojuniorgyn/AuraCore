import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, format = 'csv', filters = {} } = body;

    let data: any[] = [];
    let filename = '';

    switch (type) {
      case 'wms_events':
        const events = await db.execute(sql`SELECT * FROM wms_billing_events WHERE organization_id = 1`);
        data = events.recordset || events;
        filename = `wms_events_${Date.now()}`;
        break;

      case 'ciap':
        const ciap = await db.execute(sql`SELECT * FROM ciap_control WHERE organization_id = 1`);
        data = ciap.recordset || ciap;
        filename = `ciap_${Date.now()}`;
        break;

      case 'esg':
        const esg = await db.execute(sql`SELECT * FROM carbon_emissions WHERE organization_id = 1`);
        data = esg.recordset || esg;
        filename = `esg_emissions_${Date.now()}`;
        break;

      case 'claims':
        const claims = await db.execute(sql`SELECT * FROM claims_management WHERE organization_id = 1`);
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
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
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








