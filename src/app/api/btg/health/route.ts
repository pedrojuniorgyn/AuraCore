import { NextResponse } from "next/server";
import { container } from "@/shared/infrastructure/di/container";
import { TOKENS } from "@/shared/infrastructure/di/tokens";
import type { IBtgClient } from "@/modules/integrations/domain/ports/output/IBtgClient";
import { withDI } from '@/shared/infrastructure/di/with-di';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/btg/health
 * Verifica se a API BTG está acessível e autenticação está funcionando
 * 
 * E8 Fase 1.2: Migrado para usar IBtgClient via DI
 */
export const GET = withDI(async () => {
  try {
    const btgClient = container.resolve<IBtgClient>(TOKENS.BtgClient);
    const healthStatus = await btgClient.healthCheck();
    
    return NextResponse.json({
      success: healthStatus.healthy,
      message: healthStatus.message,
      checkedAt: healthStatus.checkedAt,
      environment: process.env.BTG_ENVIRONMENT,
      apiUrl: process.env.BTG_API_BASE_URL,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        message: "❌ Erro ao conectar com BTG API"
      },
      { status: 500 }
    );
  }
});
































