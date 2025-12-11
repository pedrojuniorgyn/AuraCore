import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fuelTransactions } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const ctx = await getTenantContext();

    const transactions = await db
      .select()
      .from(fuelTransactions)
      .where(eq(fuelTransactions.organizationId, ctx.organizationId))
      .orderBy(fuelTransactions.transactionDate);

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await getTenantContext();
    const body = await request.json();

    const [transaction] = await db
      .insert(fuelTransactions)
      .values({
        organizationId: ctx.organizationId,
        vehicleId: body.vehicleId,
        driverId: body.driverId,
        transactionDate: new Date(body.transactionDate),
        fuelType: body.fuelType,
        liters: body.liters,
        pricePerLiter: body.pricePerLiter,
        totalValue: body.totalValue,
        odometer: body.odometer,
        stationName: body.stationName,
        source: body.source || "MANUAL",
        nfeKey: body.nfeKey,
      })
      .returning();

    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}










