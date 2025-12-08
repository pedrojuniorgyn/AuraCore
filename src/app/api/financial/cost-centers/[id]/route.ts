import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { costCenters } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/financial/cost-centers/:id
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

    const result = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, id),
          eq(costCenters.organizationId, organizationId),
          isNull(costCenters.deletedAt)
        )
      );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Centro de custo não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("❌ Erro ao buscar centro de custo:", error);
    return NextResponse.json(
      { error: "Erro ao buscar centro de custo" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/financial/cost-centers/:id
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
    const { code, name, type, parentId, status } = body;

    // Verificar se existe
    const existing = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, id),
          eq(costCenters.organizationId, organizationId),
          isNull(costCenters.deletedAt)
        )
      );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Centro de custo não encontrado" },
        { status: 404 }
      );
    }

    // Verificar código duplicado
    if (code && code !== existing[0].code) {
      const duplicate = await db
        .select()
        .from(costCenters)
        .where(
          and(
            eq(costCenters.organizationId, organizationId),
            eq(costCenters.code, code),
            isNull(costCenters.deletedAt)
          )
        );

      if (duplicate.length > 0) {
        return NextResponse.json(
          { error: "Código já existe" },
          { status: 400 }
        );
      }
    }

    // Recalcular nível se mudou o pai
    let level = existing[0].level;
    if (parentId !== undefined && parentId !== existing[0].parentId) {
      if (parentId === null) {
        level = 0;
      } else {
        const parent = await db
          .select()
          .from(costCenters)
          .where(eq(costCenters.id, parentId));

        if (parent.length === 0) {
          return NextResponse.json(
            { error: "Centro de custo pai não encontrado" },
            { status: 404 }
          );
        }

        level = (parent[0].level || 0) + 1;
      }
    }

    // Atualizar
    const [updated] = await db
      .update(costCenters)
      .set({
        code: code || existing[0].code,
        name: name || existing[0].name,
        type: type || existing[0].type,
        parentId: parentId !== undefined ? parentId : existing[0].parentId,
        level,
        isAnalytical: type === "ANALYTIC" || existing[0].isAnalytical,
        status: status || existing[0].status,
        updatedBy,
        updatedAt: new Date(),
        version: existing[0].version + 1,
      })
      .where(eq(costCenters.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Centro de custo atualizado com sucesso!",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar centro de custo:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar centro de custo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/financial/cost-centers/:id
 * Soft delete
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
    const existing = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.id, id),
          eq(costCenters.organizationId, organizationId),
          isNull(costCenters.deletedAt)
        )
      );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Centro de custo não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se tem filhos
    const children = await db
      .select()
      .from(costCenters)
      .where(
        and(
          eq(costCenters.parentId, id),
          isNull(costCenters.deletedAt)
        )
      );

    if (children.length > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir. Este centro de custo possui filhos." },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(costCenters)
      .set({
        deletedAt: new Date(),
        updatedBy,
      })
      .where(eq(costCenters.id, id));

    return NextResponse.json({
      success: true,
      message: "Centro de custo excluído com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro ao excluir centro de custo:", error);
    return NextResponse.json(
      { error: "Erro ao excluir centro de custo" },
      { status: 500 }
    );
  }
}

