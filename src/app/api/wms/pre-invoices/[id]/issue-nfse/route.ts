import { NextRequest, NextResponse } from "next/server";
import { WMSBillingEngine } from "@/services/wms-billing-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const invoiceNumber = `NFS-${Date.now().toString().slice(-8)}`;
    
    await WMSBillingEngine.issueNFSe(parseInt(resolvedParams.id), invoiceNumber);

    return NextResponse.json({
      success: true,
      message: "NFS-e emitida com sucesso",
      invoiceNumber
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}






















