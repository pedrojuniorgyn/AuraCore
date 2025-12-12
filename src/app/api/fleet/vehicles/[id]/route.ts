import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicles } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar veículo específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const vehicleId = parseInt(resolvedParams.id);
    if (isNaN(vehicleId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const vehicle = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.organizationId, session.user.organizationId),
          isNull(vehicles.deletedAt)
        )
      )
      .limit(1);

    if (vehicle.length === 0) {
      return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: vehicle[0] });
  } catch (error) {
    console.error("Erro ao buscar veículo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar veículo" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar veículo
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const vehicleId = parseInt(resolvedParams.id);
    if (isNaN(vehicleId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.plate || !body.type) {
      return NextResponse.json(
        { error: "Placa e tipo são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se veículo existe
    const existing = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.organizationId, session.user.organizationId),
          isNull(vehicles.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Veículo não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se placa já existe em outro veículo
    if (body.plate !== existing[0].plate) {
      const duplicatePlate = await db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.plate, body.plate),
            eq(vehicles.organizationId, session.user.organizationId),
            isNull(vehicles.deletedAt)
          )
        )
        .limit(1);

      if (duplicatePlate.length > 0 && duplicatePlate[0].id !== vehicleId) {
        return NextResponse.json(
          { error: "Já existe um veículo com esta placa" },
          { status: 400 }
        );
      }
    }

    // Atualizar
    const updated = await db
      .update(vehicles)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(vehicles.id, vehicleId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Veículo atualizado com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar veículo:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar veículo" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete do veículo
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const vehicleId = parseInt(resolvedParams.id);
    if (isNaN(vehicleId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se veículo existe
    const existing = await db
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.organizationId, session.user.organizationId),
          isNull(vehicles.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Veículo não encontrado" },
        { status: 404 }
      );
    }

    // TODO: Adicionar validação se veículo está em viagem ativa
    // const activeTrips = await checkActiveTrips(vehicleId);
    // if (activeTrips) {
    //   return NextResponse.json(
    //     { error: "Veículo está em viagem ativa e não pode ser excluído" },
    //     { status: 400 }
    //   );
    // }

    // Soft delete
    await db
      .update(vehicles)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(vehicles.id, vehicleId));

    return NextResponse.json({
      success: true,
      message: "Veículo excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir veículo:", error);
    return NextResponse.json(
      { error: "Erro ao excluir veículo" },
      { status: 500 }
    );
  }
}





