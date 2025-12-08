import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chartOfAccounts } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/financial/chart-accounts/:id
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
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, organizationId),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("❌ Erro ao buscar conta:", error);
    return NextResponse.json(
      { error: "Erro ao buscar conta" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/financial/chart-accounts/:id
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
    const {
      code,
      name,
      type,
      category,
      parentId,
      status,
      acceptsCostCenter,
      requiresCostCenter,
    } = body;

    // Verificar se existe
    const existing = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, organizationId),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    // Verificar código duplicado
    if (code && code !== existing[0].code) {
      const duplicate = await db
        .select()
        .from(chartOfAccounts)
        .where(
          and(
            eq(chartOfAccounts.organizationId, organizationId),
            eq(chartOfAccounts.code, code),
            isNull(chartOfAccounts.deletedAt)
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
          .from(chartOfAccounts)
          .where(eq(chartOfAccounts.id, parentId));

        if (parent.length === 0) {
          return NextResponse.json(
            { error: "Conta pai não encontrada" },
            { status: 404 }
          );
        }

        level = (parent[0].level || 0) + 1;
      }
    }

    // Atualizar
    const [updated] = await db
      .update(chartOfAccounts)
      .set({
        code: code || existing[0].code,
        name: name || existing[0].name,
        type: type || existing[0].type,
        category: category !== undefined ? category : existing[0].category,
        parentId: parentId !== undefined ? parentId : existing[0].parentId,
        level,
        acceptsCostCenter:
          acceptsCostCenter !== undefined
            ? acceptsCostCenter
            : existing[0].acceptsCostCenter,
        requiresCostCenter:
          requiresCostCenter !== undefined
            ? requiresCostCenter
            : existing[0].requiresCostCenter,
        status: status || existing[0].status,
        updatedBy,
        updatedAt: new Date(),
        version: existing[0].version + 1,
      })
      .where(eq(chartOfAccounts.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Conta atualizada com sucesso!",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar conta:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar conta" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/financial/chart-accounts/:id
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
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.id, id),
          eq(chartOfAccounts.organizationId, organizationId),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Conta não encontrada" },
        { status: 404 }
      );
    }

    // Verificar se tem filhos
    const children = await db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.parentId, id),
          isNull(chartOfAccounts.deletedAt)
        )
      );

    if (children.length > 0) {
      return NextResponse.json(
        {
          error: "Não é possível excluir. Esta conta possui contas filhas.",
        },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(chartOfAccounts)
      .set({
        deletedAt: new Date(),
        updatedBy,
      })
      .where(eq(chartOfAccounts.id, id));

    return NextResponse.json({
      success: true,
      message: "Conta excluída com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro ao excluir conta:", error);
    return NextResponse.json(
      { error: "Erro ao excluir conta" },
      { status: 500 }
    );
  }
}

