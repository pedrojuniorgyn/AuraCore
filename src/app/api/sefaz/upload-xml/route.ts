import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/auth/context";
import { SefazDocumentProcessor } from "@/modules/fiscal/domain/services";
import { createFiscalDocumentImportAdapter } from "@/modules/fiscal/infrastructure/adapters";
import { Result } from "@/shared/domain";
import { gzipSync } from "zlib";

interface FileProcessResult {
  fileName: string;
  type: "NFE" | "CTE" | "UNKNOWN";
  success: boolean;
  imported?: number;
  duplicates?: number;
  errors?: number;
  error?: string;
}

/**
 * 📤 UPLOAD MANUAL DE XMLs DE NFe/CTe
 * 
 * Permite importar XMLs manualmente sem esperar o cron
 * 
 * Body (multipart/form-data):
 * - xml_files: File[] (múltiplos arquivos .xml)
 * 
 * Retorna:
 * - Total de arquivos
 * - NFes importadas
 * - CTes importados
 * - Erros
 */
export async function POST(request: NextRequest) {
  try {
    const { ensureConnection } = await import("@/lib/db");
    await ensureConnection();
    
    const ctx = await getTenantContext();
    
    // Valida se tem branch padrão
    if (!ctx.defaultBranchId) {
      return NextResponse.json(
        { error: "Usuário sem filial padrão configurada. Configure nas configurações do sistema." },
        { status: 400 }
      );
    }
    
    const formData = await request.formData();
    const files = formData.getAll("xml_files");

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    console.log(`📤 Upload de ${files.length} arquivo(s) XML iniciado...`);

    const results = {
      totalFiles: files.length,
      totalNFes: 0,
      totalCTes: 0,
      imported: 0,
      duplicates: 0,
      errors: 0,
      errorMessages: [] as string[],
      fileResults: [] as FileProcessResult[],
    };

    // Processa cada arquivo
    for (const file of files) {
      const fileName = (file as File).name;
      
      try {
        console.log(`\n📄 Processando arquivo: ${fileName}`);

        // Lê conteúdo do arquivo
        const content = await (file as File).text();

        if (!content || content.trim().length === 0) {
          throw new Error("Arquivo vazio");
        }

        // Detecta tipo de documento pelo conteúdo
        const isNFe = content.includes("<NFe") || content.includes("<nfeProc");
        const isCTe = content.includes("<CTe") || content.includes("<cteProc");

        if (!isNFe && !isCTe) {
          throw new Error("Arquivo não é NFe nem CTe válido");
        }

        // Simula resposta SEFAZ para reusar o processor
        const soapEnvelope = wrapInSoapEnvelope(content, isNFe ? "procNFe" : "procCTe");

        // Garantir que os valores são números válidos
        const orgId = typeof ctx.organizationId === 'number' 
          ? ctx.organizationId 
          : Number(ctx.organizationId);
        const branchIdNum = typeof ctx.defaultBranchId === 'number' 
          ? ctx.defaultBranchId 
          : Number(ctx.defaultBranchId);

        if (isNaN(orgId) || isNaN(branchIdNum)) {
          throw new Error('IDs de organização/filial inválidos');
        }

        // Cria adapter de importação
        const importAdapter = createFiscalDocumentImportAdapter(
          orgId,
          branchIdNum,
          ctx.userId
        );

        // Cria processor
        const processor = new SefazDocumentProcessor(importAdapter);

        // Processa o XML
        const result = await processor.processResponse(soapEnvelope);

        if (Result.isFail(result)) {
          throw new Error(result.error.message);
        }

        const processResult = result.value;

        // Atualiza contadores
        if (isNFe) {
          results.totalNFes++;
        } else {
          results.totalCTes++;
        }

        results.imported += processResult.imported;
        results.duplicates += processResult.duplicates;
        results.errors += processResult.errors;

        if (processResult.errorMessages.length > 0) {
          results.errorMessages.push(...processResult.errorMessages.map(msg => `${fileName}: ${msg}`));
        }

        results.fileResults.push({
          fileName,
          type: isNFe ? "NFe" : "CTe",
          success: processResult.imported > 0 || processResult.duplicates > 0,
          imported: processResult.imported,
          duplicates: processResult.duplicates,
          errors: processResult.errors,
        });

        console.log(`✅ ${fileName}: ${processResult.imported} importado(s)`);

      } catch (fileError: unknown) {
        const errorMessage = fileError instanceof Error ? fileError.message : 'Erro desconhecido';
        console.error(`❌ Erro ao processar ${fileName}:`, errorMessage);
        results.errors++;
        results.errorMessages.push(`${fileName}: ${errorMessage}`);
        
        results.fileResults.push({
          fileName,
          type: "UNKNOWN",
          success: false,
          error: errorMessage,
        });
      }
    }

    console.log("\n✅ Upload concluído!");
    console.log(`📊 Resultados: ${results.imported} importados, ${results.duplicates} duplicatas, ${results.errors} erros`);

    return NextResponse.json({
      success: true,
      message: `${results.imported} documento(s) importado(s) com sucesso!`,
      data: results,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao processar upload:", error);
    return NextResponse.json(
      { 
        error: "Falha ao processar upload", 
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Envolve XML em envelope SOAP para simular resposta SEFAZ
 */
function wrapInSoapEnvelope(xmlContent: string, schema: "procNFe" | "procCTe"): string {
  // Compacta e codifica em Base64 (simula docZip da SEFAZ)
  const compressed = gzipSync(Buffer.from(xmlContent, "utf-8"));
  const base64Content = compressed.toString("base64");

  // NSU fictício para upload manual
  const nsu = Date.now().toString();

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeDistDFeInteresseResponse>
      <nfeDistDFeInteresseResult>
        <retDistDFeInt>
          <tpAmb>1</tpAmb>
          <verAplic>1.0</verAplic>
          <cStat>138</cStat>
          <xMotivo>Documento localizado</xMotivo>
          <dhResp>2024-01-01T00:00:00-03:00</dhResp>
          <ultNSU>${nsu}</ultNSU>
          <maxNSU>${nsu}</maxNSU>
          <loteDistDFeInt>
            <docZip NSU="${nsu}" schema="${schema}_v4.00">
              ${base64Content}
            </docZip>
          </loteDistDFeInt>
        </retDistDFeInt>
      </nfeDistDFeInteresseResult>
    </nfeDistDFeInteresseResponse>
  </soap:Body>
</soap:Envelope>`;
}


