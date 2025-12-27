import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fiscalSettings } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    // Extrai branchId do header
    const branchId = parseInt(request.headers.get("x-branch-id") || "1");
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 });
    }
    
    const organizationId = session.user.organizationId;
    const userId = session.user.id;

    // Buscar configurações da filial
    const [settings] = await db
      .select()
      .from(fiscalSettings)
      .where(
        and(
          eq(fiscalSettings.organizationId, organizationId),
          eq(fiscalSettings.branchId, branchId)
        )
      );

    // Se não existir, criar com valores padrão do .env
    if (!settings) {
      await db.insert(fiscalSettings).values({
        organizationId,
        branchId,
        nfeEnvironment: process.env.SEFAZ_ENVIRONMENT || "production",
        cteEnvironment: process.env.CTE_ENVIRONMENT || "homologacao",
        cteSeries: "1",
        autoImportEnabled: "S",
        autoImportInterval: 1,
        createdBy: userId,
        version: 1,
      });

      // Busca o registro criado
      const [newSettings] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, organizationId),
            eq(fiscalSettings.branchId, branchId)
          )
        );

      return NextResponse.json({ data: newSettings });
    }

    return NextResponse.json({ data: settings });
  } catch (error: unknown) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PUT - Atualizar configurações fiscais
 * (RBAC temporariamente desabilitado)
 */
export async function PUT(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    // Extrai branchId do header
    const branchId = parseInt(request.headers.get("x-branch-id") || "1");
    const session = await auth();
    
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Usuário não autenticado" }, { status: 401 });
    }
    
    const organizationId = session.user.organizationId;
    const userId = session.user.id;
    
    const body = await request.json();
    const { nfeEnvironment, cteEnvironment, cteSeries, autoImportEnabled, autoImportInterval } = body;

    // Validar valores
    if (!["production", "homologacao"].includes(nfeEnvironment)) {
      return NextResponse.json(
        { error: "nfeEnvironment deve ser 'production' ou 'homologacao'" },
        { status: 400 }
      );
    }

    if (!["production", "homologacao"].includes(cteEnvironment)) {
      return NextResponse.json(
        { error: "cteEnvironment deve ser 'production' ou 'homologacao'" },
        { status: 400 }
      );
    }

    // Buscar configuração existente
    const [existing] = await db
      .select()
      .from(fiscalSettings)
      .where(
        and(
          eq(fiscalSettings.organizationId, organizationId),
          eq(fiscalSettings.branchId, branchId)
        )
      );

    let result;

    if (existing) {
      // Atualizar
      await db
        .update(fiscalSettings)
        .set({
          nfeEnvironment,
          cteEnvironment,
          cteSeries: cteSeries || existing.cteSeries,
          autoImportEnabled: autoImportEnabled !== undefined ? autoImportEnabled : existing.autoImportEnabled,
          autoImportInterval: autoImportInterval || existing.autoImportInterval,
          updatedBy: userId,
          updatedAt: new Date(),
          version: existing.version + 1,
        })
        .where(eq(fiscalSettings.id, existing.id));

      // Busca registro atualizado
      [result] = await db
        .select()
        .from(fiscalSettings)
        .where(eq(fiscalSettings.id, existing.id));
    } else {
      // Criar
      await db
        .insert(fiscalSettings)
        .values({
          organizationId,
          branchId,
          nfeEnvironment,
          cteEnvironment,
          cteSeries: cteSeries || "1",
          autoImportEnabled: autoImportEnabled || "N",
          autoImportInterval: autoImportInterval || 1,
          createdBy: userId,
          version: 1,
        });

      // Busca registro criado
      [result] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, organizationId),
            eq(fiscalSettings.branchId, branchId)
          )
        );
    }

    return NextResponse.json({ 
      success: true, 
      data: result,
      message: "Configurações fiscais atualizadas com sucesso!" 
    });
  } catch (error: unknown) {
    console.error("Erro ao atualizar fiscal settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

