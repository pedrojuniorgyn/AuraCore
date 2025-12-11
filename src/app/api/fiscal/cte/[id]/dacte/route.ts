import { NextRequest, NextResponse } from "next/server";
import { generateDACTE } from "@/services/fiscal/dacte-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const cteId = parseInt(resolvedParams.id);
    const pdf = await generateDACTE(cteId);

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="DACTE_${cteId}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}








