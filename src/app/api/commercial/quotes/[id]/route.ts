import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { freightQuotes } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * GET /api/commercial/quotes/:id
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const id = parseInt(resolvedParams.id);

    const [quote] = await db
      .select()
      .from(freightQuotes)
      .where(
        and(
          eq(freightQuotes.id, id),
          eq(freightQuotes.organizationId, organizationId),
          isNull(freightQuotes.deletedAt)
        )
      );

    if (!quote) {
      return NextResponse.json(
        { error: "Cotação não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: quote });
  } catch (error: any) {
    console.error("❌ Erro ao buscar cotação:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cotação", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/commercial/quotes/:id
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const updatedBy = session.user.email || "system";
    const id = parseInt(resolvedParams.id);

    const body = await req.json();

    // Verificar se existe
    const [existing] = await db
      .select()
      .from(freightQuotes)
      .where(
        and(
          eq(freightQuotes.id, id),
          eq(freightQuotes.organizationId, organizationId),
          isNull(freightQuotes.deletedAt)
        )
      );

    if (!existing) {
      return NextResponse.json(
        { error: "Cotação não encontrada" },
        { status: 404 }
      );
    }

    // Atualizar
    const [updated] = await db
      .update(freightQuotes)
      .set({
        ...body,
        updatedBy,
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(eq(freightQuotes.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Cotação atualizada!",
      data: updated,
    });
  } catch (error: any) {
    console.error("❌ Erro ao atualizar cotação:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cotação", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/commercial/quotes/:id
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const organizationId = session.user.organizationId;
    const updatedBy = session.user.email || "system";
    const id = parseInt(resolvedParams.id);

    // Soft delete
    await db
      .update(freightQuotes)
      .set({
        deletedAt: new Date(),
        updatedBy,
      })
      .where(
        and(
          eq(freightQuotes.id, id),
          eq(freightQuotes.organizationId, organizationId)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Cotação excluída!",
    });
  } catch (error: any) {
    console.error("❌ Erro ao excluir cotação:", error);
    return NextResponse.json(
      { error: "Erro ao excluir cotação", details: error.message },
      { status: 500 }
    );
  }
}









