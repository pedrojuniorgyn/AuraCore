import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { WMSBillingEngine } from "@/services/wms-billing-engine";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await WMSBillingEngine.sendForApproval(parseInt(params.id));

    return NextResponse.json({
      success: true,
      message: "Pré-fatura enviada para aprovação do cliente"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}



