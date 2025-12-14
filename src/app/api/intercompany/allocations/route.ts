import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || "1";
    const type = searchParams.get("type");

    if (type === 'rules') {
      const rules = await db.execute(sql`
        SELECT 
          id, 'Energia Elétrica' as name, 'Matriz' as origin, 
          'Percentual' as method, 'Mensal' as frequency
        FROM intercompany_allocations
        WHERE organization_id = ${organizationId}
        AND id = 0
      `);
      
      return NextResponse.json({
        success: true,
        data: [
          { id: 1, name: 'Energia Elétrica', origin: 'Matriz', method: 'Percentual', frequency: 'Mensal' },
          { id: 2, name: 'AWS/Cloud', origin: 'Matriz', method: 'Receita', frequency: 'Mensal' },
          { id: 3, name: 'Marketing Corpor.', origin: 'Matriz', method: 'Equal', frequency: 'Mensal' }
        ]
      });
    }

    const history = await db.execute(sql`
      SELECT 
        id, allocation_period as period, 
        'Energia' as rule,
        total_amount as value, 
        allocation_method as method, 
        status
      FROM intercompany_allocations
      WHERE organization_id = ${organizationId}
      ORDER BY allocation_period DESC
    `);

    return NextResponse.json({
      success: true,
      data: history.recordset || history
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId = 1, period, totalAmount, method } = body;

    await db.execute(sql`
      INSERT INTO intercompany_allocations 
        (organization_id, allocation_period, allocation_date, source_branch_id, source_account_id, total_amount, allocation_method, status)
      VALUES 
        (${organizationId}, ${period}, GETDATE(), 1, 1, ${totalAmount}, ${method}, 'POSTED')
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Rateio executado"
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}












