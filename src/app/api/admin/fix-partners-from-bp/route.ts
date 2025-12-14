import { NextResponse } from "next/server";
import { sql as rawSql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * 🔧 Popular partner_name e partner_document a partir de business_partners
 */
export async function GET() {
  try {
    console.log("\n🔧 Populando parceiros de business_partners...\n");

    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    const result = await db.execute(rawSql`
      UPDATE fd
      SET 
        fd.partner_name = bp.name,
        fd.partner_document = bp.document
      FROM fiscal_documents fd
      INNER JOIN inbound_invoices ii ON fd.access_key = ii.access_key
      INNER JOIN business_partners bp ON ii.partner_id = bp.id
      WHERE fd.document_type = 'NFE'
        AND (fd.partner_name IS NULL OR fd.partner_name = '');
    `);

    console.log("✅ Parceiros atualizados via business_partners!");

    return NextResponse.json({
      success: true,
      message: "Parceiros atualizados com sucesso",
    });
  } catch (error: any) {
    console.error("❌ Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}













