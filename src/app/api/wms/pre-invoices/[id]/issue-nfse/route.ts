import { NextRequest, NextResponse } from "next/server";
import { WMSBillingEngine } from "@/services/wms-billing-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceNumber = `NFS-${Date.now().toString().slice(-8)}`;
    
    await WMSBillingEngine.issueNFSe(parseInt(params.id), invoiceNumber);

    return NextResponse.json({
      success: true,
      message: "NFS-e emitida com sucesso",
      invoiceNumber
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}



