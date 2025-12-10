import { NextRequest, NextResponse } from "next/server";
import { IntercompanyAllocationEngine } from "@/services/intercompany-allocation-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await IntercompanyAllocationEngine.reverseAllocation(parseInt(params.id));

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



