import { NextResponse } from "next/server";
import { btgHealthCheck } from "@/services/btg/btg-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/btg/health
 * Verifica se a API BTG está acessível e autenticação está funcionando
 */
export async function GET() {
  try {
    const isHealthy = await btgHealthCheck();
    
    return NextResponse.json({
      success: isHealthy,
      message: isHealthy 
        ? "✅ BTG API está acessível e autenticação funcionando" 
        : "❌ BTG API não está acessível",
      environment: process.env.BTG_ENVIRONMENT,
      apiUrl: process.env.BTG_API_BASE_URL,
    });
  } catch (error: unknown) {
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
}



























