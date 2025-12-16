import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * 📄 POST /api/fiscal/documents/:id/upload-pdf
 * 
 * Upload de PDF do documento fiscal
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const documentId = parseInt(resolvedParams.id);
    const formData = await request.formData();
    const file = formData.get("pdf") as File;

    if (!file) {
      return NextResponse.json({ error: "Arquivo PDF não enviado" }, { status: 400 });
    }

    // Validar tipo
    if (!file.type.includes("pdf")) {
      return NextResponse.json({ error: "Apenas arquivos PDF são permitidos" }, { status: 400 });
    }

    // Criar diretório se não existir
    const uploadsDir = join(process.cwd(), "uploads", "fiscal", session.user.organizationId.toString());
    await mkdir(uploadsDir, { recursive: true });

    // Salvar arquivo
    const fileName = `${documentId}_${Date.now()}.pdf`;
    const filePath = join(uploadsDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Atualizar banco
    const relativePath = `/uploads/fiscal/${session.user.organizationId}/${fileName}`;
    
    await db.execute(sql`
      UPDATE fiscal_documents
      SET 
        pdf_path = ${relativePath},
        updated_at = GETDATE(),
        updated_by = ${session.user.id}
      WHERE id = ${documentId}
    `);

    return NextResponse.json({
      success: true,
      filePath: relativePath,
    });
  } catch (error: any) {
    console.error("❌ Erro ao fazer upload do PDF:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}














