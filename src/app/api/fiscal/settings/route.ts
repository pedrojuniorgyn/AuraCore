import { NextRequest, NextResponse } from "next/server";
import { withDI } from '@/shared/infrastructure/di/with-di';
import { db } from "@/lib/db";
import { fiscalSettings } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

import { logger } from '@/shared/infrastructure/logging';
export const GET = withDI(async (request: NextRequest) => {
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

    // E9.3: REPO-006 - Buscar configurações da filial com soft delete
    const [settings] = await db
      .select()
      .from(fiscalSettings)
      .where(
        and(
          eq(fiscalSettings.organizationId, organizationId),
          eq(fiscalSettings.branchId, branchId),
          isNull(fiscalSettings.deletedAt) // REPO-006: soft delete
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

      // E9.3: REPO-006 - Busca o registro criado com soft delete
      const [newSettings] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, organizationId),
            eq(fiscalSettings.branchId, branchId),
            isNull(fiscalSettings.deletedAt) // REPO-006: soft delete
          )
        );

      return NextResponse.json({ data: newSettings });
    }

    return NextResponse.json({ data: settings });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

/**
 * PUT - Atualizar configurações fiscais
 * (RBAC temporariamente desabilitado)
 */
export const PUT = withDI(async (request: NextRequest) => {
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

    // E9.3: REPO-006 - Buscar configuração existente com soft delete
    const [existing] = await db
      .select()
      .from(fiscalSettings)
      .where(
        and(
          eq(fiscalSettings.organizationId, organizationId),
          eq(fiscalSettings.branchId, branchId),
          isNull(fiscalSettings.deletedAt) // REPO-006: soft delete
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

      // E9.3: REPO-006 - Busca registro criado com soft delete
      [result] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, organizationId),
            eq(fiscalSettings.branchId, branchId),
            isNull(fiscalSettings.deletedAt) // REPO-006: soft delete
          )
        );
    }

    return NextResponse.json({ 
      success: true, 
      data: result,
      message: "Configurações fiscais atualizadas com sucesso!" 
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Erro ao atualizar fiscal settings:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
});

