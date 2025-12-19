import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tires, tireMovements } from "@/lib/db/schema";
import { getTenantContext } from "@/lib/auth/context";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const ctx = await getTenantContext();
    const tireId = parseInt(resolvedParams.id);
    const body = await request.json();

    const { movementType, toVehicleId, toPosition, mileageAtMovement } = body;

    // Buscar pneu
    const [tire] = await db
      .select()
      .from(tires)
      .where(eq(tires.id, tireId));

    if (!tire) {
      return NextResponse.json({ error: "Pneu não encontrado" }, { status: 404 });
    }

    // Registrar movimento
    await db.insert(tireMovements).values({
      tireId,
      movementType,
      fromVehicleId: tire.currentVehicleId,
      fromPosition: tire.position,
      toVehicleId,
      toPosition,
      mileageAtMovement,
      createdBy: ctx.userId,
    });

    // Atualizar pneu
    await db
      .update(tires)
      .set({
        currentVehicleId: toVehicleId,
        position: toPosition,
        status: toVehicleId ? "IN_USE" : "STOCK",
        currentMileage: mileageAtMovement || tire.currentMileage,
        totalKmUsed: mileageAtMovement
          ? (mileageAtMovement - (tire.initialMileage || 0))
          : tire.totalKmUsed,
      })
      .where(eq(tires.id, tireId));

    return NextResponse.json({ success: true, message: "Movimento registrado" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



















