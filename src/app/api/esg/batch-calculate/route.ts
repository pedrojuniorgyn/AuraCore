import { NextRequest, NextResponse } from "next/server";
import { ESGCarbonCalculator } from "@/services/esg-carbon-calculator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId = 1, startDate, endDate } = body;

    const result = await ESGCarbonCalculator.batchCalculate(
      organizationId,
      new Date(startDate),
      new Date(endDate)
    );

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
























