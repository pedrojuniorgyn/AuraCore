import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { taxMatrix } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/fiscal/tax-matrix/:id
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const id = parseInt(params.id);

    const [rule] = await db
      .select()
      .from(taxMatrix)
      .where(
        and(
          eq(taxMatrix.id, id),
          eq(taxMatrix.organizationId, organizationId),
          isNull(taxMatrix.deletedAt)
        )
      );

    if (!rule) {
      return NextResponse.json(
        { error: "Regra fiscal não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error: any) {
    console.error("❌ Erro ao buscar regra fiscal:", error);
    return NextResponse.json(
      { error: "Erro ao buscar regra fiscal", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/fiscal/tax-matrix/:id
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const updatedBy = session.user.email || "system";
    const id = parseInt(params.id);

    const body = await req.json();

    // Verificar se existe
    const [existing] = await db
      .select()
      .from(taxMatrix)
      .where(
        and(
          eq(taxMatrix.id, id),
          eq(taxMatrix.organizationId, organizationId),
          isNull(taxMatrix.deletedAt)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Regra fiscal não encontrada" },
        { status: 404 }
      );
    }

    // Atualizar
    const [updated] = await db
      .update(taxMatrix)
      .set({
        icmsRate: body.icmsRate?.toString() || existing.icmsRate,
        icmsStRate: body.icmsStRate ? body.icmsStRate.toString() : existing.icmsStRate,
        icmsReduction: body.icmsReduction ? body.icmsReduction.toString() : existing.icmsReduction,
        fcpRate: body.fcpRate ? body.fcpRate.toString() : existing.fcpRate,
        cfopInternal: body.cfopInternal !== undefined ? body.cfopInternal : existing.cfopInternal,
        cfopInterstate: body.cfopInterstate !== undefined ? body.cfopInterstate : existing.cfopInterstate,
        cst: body.cst || existing.cst,
        validFrom: body.validFrom ? new Date(body.validFrom) : existing.validFrom,
        validTo: body.validTo ? new Date(body.validTo) : existing.validTo,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        status: body.status || existing.status,
        updatedBy,
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(eq(taxMatrix.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Regra fiscal atualizada com sucesso!",
      data: updated,
    });
  } catch (error: any) {
    console.error("❌ Erro ao atualizar regra fiscal:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar regra fiscal", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/fiscal/tax-matrix/:id
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const updatedBy = session.user.email || "system";
    const id = parseInt(params.id);

    // Verificar se existe
    const [existing] = await db
      .select()
      .from(taxMatrix)
      .where(
        and(
          eq(taxMatrix.id, id),
          eq(taxMatrix.organizationId, organizationId),
          isNull(taxMatrix.deletedAt)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Regra fiscal não encontrada" },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(taxMatrix)
      .set({
        deletedAt: new Date(),
        updatedBy,
      })
      .where(eq(taxMatrix.id, id));

    return NextResponse.json({
      success: true,
      message: "Regra fiscal excluída com sucesso!",
    });
  } catch (error: any) {
    console.error("❌ Erro ao excluir regra fiscal:", error);
    return NextResponse.json(
      { error: "Erro ao excluir regra fiscal", details: error.message },
      { status: 500 }
    );
  }
}

