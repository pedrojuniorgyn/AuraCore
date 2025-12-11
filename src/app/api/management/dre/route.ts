import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculateManagementDRE } from "@/services/management-accounting";

/**
 * GET /api/management/dre?period=2024-12&branchId=1&serviceType=FTL
 * Calcula DRE Gerencial
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
    const branchId = searchParams.get("branchId");
    const serviceType = searchParams.get("serviceType");

    const organizationId = BigInt(session.user.organizationId);

    const dreData = await calculateManagementDRE(
      period,
      organizationId,
      branchId ? parseInt(branchId) : undefined,
      serviceType || undefined
    );

    return NextResponse.json({
      success: true,
      data: dreData,
      metadata: {
        period,
        branchId,
        serviceType,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("❌ Erro ao calcular DRE Gerencial:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}







