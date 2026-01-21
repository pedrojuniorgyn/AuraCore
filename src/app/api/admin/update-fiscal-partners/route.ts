import { NextResponse } from "next/server";
import { sql as rawSql } from "drizzle-orm";
import { db, getDbRows } from "@/lib/db";
import { NfeXmlParser } from "@/modules/fiscal/domain/services";
import { Result } from "@/shared/domain";

/**
 * 🔄 Atualizar nomes de parceiros em fiscal_documents
 * 
 * Extrai o nome do emitente/remetente dos XMLs armazenados
 */
export async function GET() {
  try {
    console.log("\n🔄 Atualizando nomes de parceiros em fiscal_documents...\n");

    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();

    let updated = 0;

    // 1️⃣ ATUALIZAR NFes
    console.log("1️⃣ Processando NFes...");
    
    interface NfeRow {
      id: number;
      document_type: string;
      xml_content: string;
      partner_name: string;
    }
    
    const result = await db.execute(rawSql`
      SELECT TOP 50 id, document_type, xml_content, partner_name
      FROM fiscal_documents
      WHERE document_type = 'NFE' 
        AND xml_content IS NOT NULL
    `);
    
    const nfes = getDbRows<NfeRow>(result as unknown as { recordset?: NfeRow[] });
    
    for (const doc of nfes) {
      try {
        if (!doc.xml_content) continue;
        
        // Usar NfeXmlParser (Domain Service) ao invés do serviço legado
        const parseResult = NfeXmlParser.parse(doc.xml_content);
        
        if (Result.isFail(parseResult)) {
          console.log(`  ⚠️  NFe ${doc.id}: Erro ao processar - ${parseResult.error}`);
          continue;
        }
        
        const parsed = parseResult.value;
        
        await db.execute(rawSql`
          UPDATE fiscal_documents
          SET 
            partner_name = ${parsed.issuer.name},
            partner_document = ${parsed.issuer.cnpj}
          WHERE id = ${doc.id}
        `);
        
        updated++;
        console.log(`  ✅ NFe ${doc.id}: ${parsed.issuer.name} (${parsed.issuer.cnpj})`);
      } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
        console.log(`  ⚠️  NFe ${doc.id}: Erro ao processar - ${error}`);
      }
    }
    
    console.log(`\n✅ ${updated} NFes atualizadas!\n`);

    return NextResponse.json({
      success: true,
      message: "Parceiros atualizados com sucesso",
      nfes: updated,
      total: updated,
    });
  } catch (error: unknown) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao atualizar parceiros:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

