import { NextRequest, NextResponse } from "next/server";
import { ClaimsWorkflowEngine } from "@/services/claims-workflow-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = await request.json();
    const { decision, amount, notes } = body;

    await ClaimsWorkflowEngine.decideAction(parseInt(resolvedParams.id), {
      decision,
      amount,
      notes
    });

    return NextResponse.json({
      success: true,
      message: `Decisão registrada: ${decision}`
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}




















