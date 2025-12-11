import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { vehicleDocuments } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

// GET - Buscar documento de veículo específico
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

    const documentId = parseInt(resolvedParams.id);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const document = await db
      .select()
      .from(vehicleDocuments)
      .where(
        and(
          eq(vehicleDocuments.id, documentId),
          eq(vehicleDocuments.organizationId, session.user.organizationId),
          isNull(vehicleDocuments.deletedAt)
        )
      )
      .limit(1);

    if (document.length === 0) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: document[0] });
  } catch (error) {
    console.error("Erro ao buscar documento:", error);
    return NextResponse.json(
      { error: "Erro ao buscar documento" },
      { status: 500 }
    );
  }
}

// PUT - Atualizar documento de veículo
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

    const documentId = parseInt(resolvedParams.id);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    // Validações básicas
    if (!body.vehicleId || !body.documentType || !body.expiryDate) {
      return NextResponse.json(
        { error: "Veículo, tipo de documento e data de vencimento são obrigatórios" },
        { status: 400 }
      );
    }

    // Verificar se documento existe
    const existing = await db
      .select()
      .from(vehicleDocuments)
      .where(
        and(
          eq(vehicleDocuments.id, documentId),
          eq(vehicleDocuments.organizationId, session.user.organizationId),
          isNull(vehicleDocuments.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    // Atualizar status baseado na data de vencimento
    const expiryDate = new Date(body.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let status = "VALID";
    if (daysUntilExpiry < 0) {
      status = "EXPIRED";
    } else if (daysUntilExpiry <= 30) {
      status = "EXPIRING_SOON";
    }

    // Atualizar
    const updated = await db
      .update(vehicleDocuments)
      .set({
        ...body,
        status,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(vehicleDocuments.id, documentId))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Documento atualizado com sucesso",
      data: updated[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar documento:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar documento" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete do documento
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

    const documentId = parseInt(resolvedParams.id);
    if (isNaN(documentId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar se documento existe
    const existing = await db
      .select()
      .from(vehicleDocuments)
      .where(
        and(
          eq(vehicleDocuments.id, documentId),
          eq(vehicleDocuments.organizationId, session.user.organizationId),
          isNull(vehicleDocuments.deletedAt)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    // Soft delete
    await db
      .update(vehicleDocuments)
      .set({
        deletedAt: new Date(),
        deletedBy: session.user.id,
      })
      .where(eq(vehicleDocuments.id, documentId));

    return NextResponse.json({
      success: true,
      message: "Documento excluído com sucesso",
    });
  } catch (error) {
    console.error("Erro ao excluir documento:", error);
    return NextResponse.json(
      { error: "Erro ao excluir documento" },
      { status: 500 }
    );
  }
}




