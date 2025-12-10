import { NextRequest, NextResponse } from "next/server";
import { ClaimsWorkflowEngine } from "@/services/claims-workflow-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { decision, amount, notes } = body;

    await ClaimsWorkflowEngine.decideAction(parseInt(params.id), {
      decision,
      amount,
      notes
    });

    return NextResponse.json({
      success: true,
      message: `Decisão registrada: ${decision}`
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}



