/**
 * API: Drivers (Motoristas)
 * GET/POST /api/fleet/drivers
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drivers } from "@/lib/db/schema";
import { and, eq, isNull, desc, like } from "drizzle-orm";
import { validateCPF, formatCPF } from "@/lib/validators/fleet-validators";
import { getTenantContext } from "@/lib/auth/context";

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const GET = withDI(async (request: NextRequest) => {
  try {
    // E9.3: Usar getTenantContext para multi-tenancy
    const ctx = await getTenantContext();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // E9.3: REPO-005 + REPO-006 - Multi-tenancy completo + soft delete
    const conditions = [
      eq(drivers.organizationId, ctx.organizationId),
      eq(drivers.branchId, ctx.branchId), // REPO-005: branchId obrigatório
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
  } catch (error: unknown) {
    if (error instanceof Response) return error;
    logger.error("❌ Erro ao listar motoristas:", error);
    return NextResponse.json(
      { error: "Falha ao listar motoristas" },
      { status: 500 }
    );
  }
});

export const POST = withDI(async (request: NextRequest) => {
  try {
    // E9.3: Usar getTenantContext para multi-tenancy
    const ctx = await getTenantContext();
    const body = await request.json();
    const {
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

    // E9.3: Verificar se CPF já existe com branchId
    const cleanCpf = cpf.replace(/\D/g, "");
    const [existingDriver] = await db
      .select()
      .from(drivers)
      .where(
        and(
          eq(drivers.cpf, formatCPF(cleanCpf)),
          eq(drivers.organizationId, ctx.organizationId),
          eq(drivers.branchId, ctx.branchId), // REPO-005: branchId obrigatório
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

    // E9.3: REPO-005 - branchId obrigatório no insert
    await db
      .insert(drivers)
      .values({
        organizationId: ctx.organizationId,
        branchId: ctx.branchId, // REPO-005: branchId obrigatório
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
        createdBy: ctx.userId || "system",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    return NextResponse.json({
      success: true,
      message: "Motorista criado com sucesso!",
      warning,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("❌ Erro ao criar motorista:", error);
    return NextResponse.json(
      { error: errorMessage || "Falha ao criar motorista" },
      { status: 500 }
    );
  }
});


