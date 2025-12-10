import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { proposals } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar proposta específica
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const proposalId = parseInt(params.id);
    if (isNaN(proposalId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const proposal = await db
      .select()
      .from(proposals)
      .where(
        and(
          eq(proposals.id, proposalId),
          eq(proposals.organizationId, session.user.organizationId),
          isNull(proposals.deletedAt)
        )
      )
      .limit(1);

    if (proposal.length === 0) {
      return NextResponse.json(
        { error: "Proposta não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: proposal[0] });
  } catch (error) {
    console.error("Erro ao buscar proposta:", error);
    return NextResponse.json(
      { error: "Erro ao buscar proposta" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar proposta
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const proposalId = parseInt(params.id);
    if (isNaN(proposalId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.customerId || !body.validUntil) {
      return NextResponse.json(
        { error: "Cliente e validade são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se proposta existe
    const existing = await db
      .select()
      .from(proposals)
      .where(
        and(
          eq(proposals.id, proposalId),
          eq(proposals.organizationId, session.user.organizationId),
          isNull(proposals.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Proposta não encontrada" },
        { status: 404 }
      );
    }

    // Validar mudança de status
    if (body.status === "APPROVED" && existing[0].status === "REJECTED") {
      return NextResponse.json(
        { error: "Não é possível aprovar proposta rejeitada" },
        { status: 400 }
      );
    }

    if (existing[0].status === "APPROVED" || existing[0].status === "REJECTED") {
      return NextResponse.json(
        { error: "Não é possível editar proposta aprovada ou rejeitada" },
        { status: 400 }
      );
    }

    // Atualizar
    const updated = await db
      .update(proposals)
      .set({
        ...body,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, proposalId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Proposta atualizada com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar proposta:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar proposta" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete da proposta
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const proposalId = parseInt(params.id);
    if (isNaN(proposalId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se proposta existe
    const existing = await db
      .select()
      .from(proposals)
      .where(
        and(
          eq(proposals.id, proposalId),
          eq(proposals.organizationId, session.user.organizationId),
          isNull(proposals.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Proposta não encontrada" },
        { status: 404 }
      );
    }

    // Validar status antes de excluir
    if (existing[0].status === "APPROVED") {
      return NextResponse.json(
        { error: "Não é possível excluir proposta aprovada" },
        { status: 400 }
      );
    }

    // Soft delete
    await db
      .update(proposals)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(proposals.id, proposalId));

    return NextResponse.json({
      success: true,
      message: "Proposta excluída com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir proposta:", error);
    return NextResponse.json(
      { error: "Erro ao excluir proposta" },
      { status: 500 }
    );
  }
}
