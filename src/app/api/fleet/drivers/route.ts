/**
 * API: Drivers (Motoristas)
 * GET/POST /api/fleet/drivers
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drivers } from "@/lib/db/schema";
import { and, eq, isNull, desc, like } from "drizzle-orm";
import { validateCPF, formatCPF } from "@/lib/validators/fleet-validators";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const organizationId = Number(searchParams.get("organizationId") || "1");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // === BUSCAR DRIVERS ===
    const conditions = [
      eq(drivers.organizationId, organizationId),
      isNull(drivers.deletedAt),
    ];

    if (status) {
      conditions.push(eq(drivers.status, status));
    }

    if (search) {
      conditions.push(like(drivers.name, `%${search}%`));
    }

    const driversList = await db
      .select()
      .from(drivers)
      .where(and(...conditions))
      .orderBy(desc(drivers.createdAt));

    return NextResponse.json({ data: driversList });
  } catch (error) {
    console.error("❌ Erro ao listar motoristas:", error);
    return NextResponse.json(
      { error: "Falha ao listar motoristas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organizationId,
      name,
      cpf,
      phone,
      email,
      cnhNumber,
      cnhCategory,
      cnhExpiry,
      cnhIssueDate,
      partnerId,
      notes,
    } = body;

    // === VALIDAÇÕES ===
    if (!name || !cpf || !cnhNumber || !cnhCategory || !cnhExpiry) {
      return NextResponse.json(
        { error: "Campos obrigatórios: Nome, CPF, CNH, Categoria e Validade CNH" },
        { status: 400 }
      );
    }

    // Validar CPF
    if (!validateCPF(cpf)) {
      return NextResponse.json(
        { error: "CPF inválido" },
        { status: 400 }
      );
    }

    // Verificar se CPF já existe
    const cleanCpf = cpf.replace(/\D/g, "");
    const [existingDriver] = await db
      .select()
      .from(drivers)
      .where(
        and(
          eq(drivers.cpf, formatCPF(cleanCpf)),
          eq(drivers.organizationId, organizationId),
          isNull(drivers.deletedAt)
        )
      );

    if (existingDriver) {
      return NextResponse.json(
        { error: "CPF já cadastrado para esta organização" },
        { status: 409 }
      );
    }

    // Verificar se CNH está vencida
    const cnhExpiryDate = new Date(cnhExpiry);
    const today = new Date();
    const isCnhExpired = cnhExpiryDate < today;

    let driverStatus = "ACTIVE";
    let warning = null;

    if (isCnhExpired) {
      driverStatus = "BLOCKED";
      warning = "⚠️ CNH vencida! Motorista criado com status BLOQUEADO.";
    }

    // === CRIAR MOTORISTA ===
    await db
      .insert(drivers)
      .values({
        organizationId,
        name,
        cpf: formatCPF(cleanCpf),
        phone,
        email,
        cnhNumber,
        cnhCategory: cnhCategory.toUpperCase(),
        cnhExpiry: cnhExpiryDate,
        cnhIssueDate: cnhIssueDate ? new Date(cnhIssueDate) : null,
        partnerId,
        status: driverStatus,
        notes,
        createdBy: "system", // TODO: Pegar usuário logado
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      message: "Motorista criado com sucesso!",
      warning,
    });
  } catch (error: unknown) {
    console.error("❌ Erro ao criar motorista:", error);
    return NextResponse.json(
      { error: error.message || "Falha ao criar motorista" },
      { status: 500 }
    );
  }
}


