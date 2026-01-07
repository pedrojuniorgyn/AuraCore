import { NextRequest, NextResponse } from "next/server";
import { CIAPEngine } from "@/services/ciap-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId = 1, period } = body;

    const blockG = await CIAPEngine.generateSpedBlockG(organizationId, period);

    return NextResponse.json({
      success: true,
      lines: blockG,
      message: `Bloco G gerado com ${blockG.length} linhas`
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}






























