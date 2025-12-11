import { NextRequest, NextResponse } from "next/server";
import { IntercompanyAllocationEngine } from "@/services/intercompany-allocation-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    await IntercompanyAllocationEngine.reverseAllocation(parseInt(resolvedParams.id));

    return NextResponse.json({
      success: true,
      message: "Rateio estornado com sucesso"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}






