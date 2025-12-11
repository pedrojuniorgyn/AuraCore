import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { drivers } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar motorista específico
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

    const driverId = parseInt(resolvedParams.id);
    if (isNaN(driverId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const driver = await db
      .select()
      .from(drivers)
      .where(
        and(
          eq(drivers.id, driverId),
          eq(drivers.organizationId, session.user.organizationId),
          isNull(drivers.deletedAt)
        )
      )
      .limit(1);

    if (driver.length === 0) {
      return NextResponse.json(
        { error: "Motorista não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: driver[0] });
  } catch (error) {
    console.error("Erro ao buscar motorista:", error);
    return NextResponse.json(
      { error: "Erro ao buscar motorista" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar motorista
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

    const driverId = parseInt(resolvedParams.id);
    if (isNaN(driverId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.name || !body.cpf || !body.cnhNumber) {
      return NextResponse.json(
        { error: "Nome, CPF e CNH são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se motorista existe
    const existing = await db
      .select()
      .from(drivers)
      .where(
        and(
          eq(drivers.id, driverId),
          eq(drivers.organizationId, session.user.organizationId),
          isNull(drivers.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Motorista não encontrado" },
        { status: 404 }
      );
    }

    // Verificar CPF duplicado
    if (body.cpf !== existing[0].cpf) {
      const duplicateCpf = await db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.cpf, body.cpf),
            eq(drivers.organizationId, session.user.organizationId),
            isNull(drivers.deletedAt)
          )
        )
        .limit(1);

      if (duplicateCpf.length > 0 && duplicateCpf[0].id !== driverId) {
        return NextResponse.json(
          { error: "Já existe um motorista com este CPF" },
          { status: 400 }
        );
      }
    }

    // Verificar CNH duplicada
    if (body.cnhNumber !== existing[0].cnhNumber) {
      const duplicateCnh = await db
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.cnhNumber, body.cnhNumber),
            eq(drivers.organizationId, session.user.organizationId),
            isNull(drivers.deletedAt)
          )
        )
        .limit(1);

      if (duplicateCnh.length > 0 && duplicateCnh[0].id !== driverId) {
        return NextResponse.json(
          { error: "Já existe um motorista com esta CNH" },
          { status: 400 }
        );
      }
    }

    // Atualizar
    const updated = await db
      .update(drivers)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(drivers.id, driverId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Motorista atualizado com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar motorista:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar motorista" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete do motorista
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

    const driverId = parseInt(resolvedParams.id);
    if (isNaN(driverId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se motorista existe
    const existing = await db
      .select()
      .from(drivers)
      .where(
        and(
          eq(drivers.id, driverId),
          eq(drivers.organizationId, session.user.organizationId),
          isNull(drivers.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Motorista não encontrado" },
        { status: 404 }
      );
    }

    // TODO: Validar se motorista está em viagem ativa
    // const activeTrips = await checkActiveTripsForDriver(driverId);
    // if (activeTrips) {
    //   return NextResponse.json(
    //     { error: "Motorista está em viagem ativa e não pode ser excluído" },
    //     { status: 400 }
    //   );
    // }

    // Soft delete
    await db
      .update(drivers)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(drivers.id, driverId));

    return NextResponse.json({
      success: true,
      message: "Motorista excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir motorista:", error);
    return NextResponse.json(
      { error: "Erro ao excluir motorista" },
      { status: 500 }
    );
  }
}



