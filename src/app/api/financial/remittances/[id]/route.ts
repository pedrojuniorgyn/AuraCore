import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bankRemittances } from "@/lib/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { queryFirst } from "@/lib/db/query-helpers";

// GET - Buscar remessa específica
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

    const remittanceId = parseInt(resolvedParams.id);
    if (isNaN(remittanceId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const remittance = await queryFirst<typeof bankRemittances.$inferSelect>(
      db
        .select()
        .from(bankRemittances)
        .where(
          and(
            eq(bankRemittances.id, remittanceId),
            eq(bankRemittances.organizationId, session.user.organizationId),
            isNull(bankRemittances.deletedAt)
          )
        )
        .orderBy(asc(bankRemittances.id))
    );

    if (!remittance) {
      return NextResponse.json(
        { error: "Remessa não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: remittance });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao buscar remessa:", error);
    return NextResponse.json(
      { error: "Erro ao buscar remessa" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da remessa (apenas se não foi processada)
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

    const remittanceId = parseInt(resolvedParams.id);
    if (isNaN(remittanceId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se remessa existe
    const existing = await queryFirst<typeof bankRemittances.$inferSelect>(
      db
        .select()
        .from(bankRemittances)
        .where(
          and(
            eq(bankRemittances.id, remittanceId),
            eq(bankRemittances.organizationId, session.user.organizationId),
            isNull(bankRemittances.deletedAt)
          )
        )
        .orderBy(asc(bankRemittances.id))
    );

    if (!existing) {
      return NextResponse.json(
        { error: "Remessa não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing.status === "PROCESSED") {
      return NextResponse.json(
        { error: "Não é possível excluir remessa já processada pelo banco" },
        { status: 400 }
      );
    }

    if (existing.status === "SENT") {
      return NextResponse.json(
        { error: "Não é possível excluir remessa já enviada ao banco" },
        { status: 400 }
      );
    }

    // TODO: Desvincular títulos da remessa
    // await unlinkPayablesFromRemittance(remittanceId);

    // Soft delete
    await db
      .update(bankRemittances)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(bankRemittances.id, remittanceId));

    return NextResponse.json({
      success: true,
      message: "Remessa excluída com sucesso",
    });
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    console.error("Erro ao excluir remessa:", error);
    return NextResponse.json(
      { error: "Erro ao excluir remessa" },
      { status: 500 }
    );
  }
}










