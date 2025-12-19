import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId") || "1";

    const emissions = await db.execute(sql`
      SELECT 
        customer_id, customer_name as customer,
        COUNT(*) as trips,
        SUM(fuel_consumed_liters) as diesel,
        SUM(distance_km) as distance,
        SUM(co2_emission_kg) as co2_kg,
        SUM(co2_emission_tons) as co2_ton
      FROM carbon_emissions
      WHERE organization_id = ${organizationId}
        AND emission_date >= DATEADD(month, -1, GETDATE())
      GROUP BY customer_id, customer_name
      ORDER BY co2_ton DESC
    `);

    return NextResponse.json({
      success: true,
      data: emissions.recordset || emissions
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId = 1, documentId, fuelLiters, distanceKm, customerId } = body;

    const emissionFactor = 2.60;
    const co2Kg = fuelLiters * emissionFactor;
    const co2Ton = co2Kg / 1000;
    const efficiency = distanceKm / fuelLiters;

    await db.execute(sql`
      INSERT INTO carbon_emissions 
        (organization_id, document_type, document_id, fuel_consumed_liters, distance_km, 
         fuel_efficiency, emission_factor, co2_emission_kg, co2_emission_tons, 
         customer_id, emission_date, offset_status)
      VALUES 
        (${organizationId}, 'CTE', ${documentId}, ${fuelLiters}, ${distanceKm}, 
         ${efficiency}, ${emissionFactor}, ${co2Kg}, ${co2Ton},
         ${customerId}, GETDATE(), 'NONE')
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Emissão de carbono calculada",
      co2_ton: co2Ton
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
















