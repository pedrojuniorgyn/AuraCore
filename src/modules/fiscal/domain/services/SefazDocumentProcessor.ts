/**
 * SEFAZ Document Processor - Domain Service
 * 
 * Processa documentos fiscais retornados pela SEFAZ (DistribuicaoDFe):
 * - Descompacta documentos GZip (docZip)
 * - Roteia diferentes tipos (resNFe, procNFe, procCTe, resEvento)
 * - Coordena importação de NFes e CTes
 * 
 * @epic E7.13 - Services → DDD Migration
 * @service 2/9 - sefaz-processor.ts → SefazDocumentProcessor
 */

import { XMLParser } from "fast-xml-parser";
import zlib from "zlib";
import { Result } from "@/shared/domain";
import { FiscalDocumentError } from "../errors/FiscalDocumentError";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SefazDocZip {
  "@_NSU": string;
  "@_schema": string;
  "#text": string; // Base64 encoded GZip
}

export interface SefazDistDFeResponse {
  cStat: string | number;
  xMotivo: string;
  ultNSU: string;
  maxNSU: string;
  loteDistDFeInt?: {
    docZip?: SefazDocZip | SefazDocZip[];
  };
}

export interface ProcessDocumentResult {
  totalDocuments: number;
  imported: number;
  duplicates: number;
  errors: number;
  resumos: number;
  completas: number;
  errorMessages: string[];
  message?: string;
}

export interface DocumentImporter {
  importNFe(xmlContent: string): Promise<Result<"SUCCESS" | "DUPLICATE", FiscalDocumentError>>;
  importCTe(xmlContent: string): Promise<Result<"SUCCESS" | "DUPLICATE", FiscalDocumentError>>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMAIN SERVICE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export class SefazDocumentProcessor {
  private readonly parser: XMLParser;

  constructor(private readonly importer: DocumentImporter) {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true,
      parseTagValue: true,
      trimValues: true,
    });
  }

  /**
   * Processa a resposta XML da SEFAZ DistribuicaoDFe
   */
  async processResponse(xmlResponse: string): Promise<Result<ProcessDocumentResult, FiscalDocumentError>> {
    const result: ProcessDocumentResult = {
      totalDocuments: 0,
      imported: 0,
      duplicates: 0,
      errors: 0,
      resumos: 0,
      completas: 0,
      errorMessages: [],
    };

    try {
      console.log("🔍 Parseando resposta da Sefaz...");

      // Parse do XML de resposta
      const responseObj = this.parser.parse(xmlResponse);

      // Navega até a estrutura do retorno
      const soapBody = responseObj["soap:Envelope"]?.["soap:Body"];
      const nfeDistDFeInteresseResponse = soapBody?.nfeDistDFeInteresseResponse;
      const nfeDistDFeInteresseResult = nfeDistDFeInteresseResponse?.nfeDistDFeInteresseResult;
      const retDistDFeInt = nfeDistDFeInteresseResult?.retDistDFeInt as SefazDistDFeResponse | undefined;

      if (!retDistDFeInt) {
        return Result.fail(
          new FiscalDocumentError("Estrutura de resposta inválida (retDistDFeInt não encontrado)")
        );
      }

      // Verifica status da resposta
      const cStat = retDistDFeInt.cStat;
      const xMotivo = retDistDFeInt.xMotivo;
      const ultNSU = retDistDFeInt.ultNSU;
      const maxNSU = retDistDFeInt.maxNSU;

      console.log(`📊 Status Sefaz: ${cStat} - ${xMotivo}`);
      console.log(`🔢 ultNSU: ${ultNSU}, maxNSU: ${maxNSU}`);

      // Status 138: Documentos localizados
      if (cStat !== "138" && cStat !== 138) {
        console.log(`⚠️  Nenhum documento novo (Status: ${cStat})`);
        console.log(`📋 Retorno completo:`, JSON.stringify(retDistDFeInt, null, 2));
        return Result.ok(result);
      }

      // Extrai documentos
      const loteDistDFeInt = retDistDFeInt.loteDistDFeInt;

      if (!loteDistDFeInt || !loteDistDFeInt.docZip) {
        console.log("⚠️  Nenhum documento no lote");
        return Result.ok(result);
      }

      // Normaliza docZip para array
      const docZipArray = Array.isArray(loteDistDFeInt.docZip)
        ? loteDistDFeInt.docZip
        : [loteDistDFeInt.docZip];

      result.totalDocuments = docZipArray.length;

      console.log(`📦 Total de documentos: ${result.totalDocuments}`);

      // Processa cada documento
      for (const docZip of docZipArray) {
        const docResult = await this.processDocument(docZip);

        if (Result.isOk(docResult)) {
          const { type, status } = docResult.value;

          // Atualiza contadores
          if (type === "resNFe") {
            result.resumos++;
          } else if (type === "procNFe" || type === "procCTe") {
            result.completas++;

            if (status === "SUCCESS") {
              result.imported++;
            } else if (status === "DUPLICATE") {
              result.duplicates++;
            }
          }
        } else {
          result.errors++;
          result.errorMessages.push(docResult.error.message);
        }
      }

      console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("📊 RESUMO DA IMPORTAÇÃO:");
      console.log(`  ├─ 📦 Total retornados: ${result.totalDocuments}`);
      console.log(`  ├─ ✅ Importados: ${result.imported}`);
      console.log(`  ├─ ⚠️  Duplicados: ${result.duplicates}`);
      console.log(`  ├─ ❌ Erros: ${result.errors}`);
      console.log(`  ├─ 📋 Resumos: ${result.resumos}`);
      console.log(`  └─ 📄 Completos: ${result.completas}`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

      // Validação: Se todos são duplicatas, alertar
      if (result.duplicates === result.totalDocuments && result.totalDocuments > 0) {
        console.warn("⚠️  ALERTA: TODOS os documentos retornados são duplicatas!");
        console.warn("⚠️  Isso pode indicar que o NSU não está sendo atualizado corretamente.");
        console.warn("⚠️  Ou os documentos já foram importados anteriormente.");
      }

      return Result.ok(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Erro ao processar resposta Sefaz:", errorMessage);
      return Result.fail(new FiscalDocumentError(`Erro ao processar resposta Sefaz: ${errorMessage}`));
    }
  }

  /**
   * Processa um único documento do lote
   */
  private async processDocument(
    docZip: SefazDocZip
  ): Promise<Result<{ type: string; status: "SUCCESS" | "DUPLICATE" | "IGNORED" }, FiscalDocumentError>> {
    try {
      const nsu = docZip["@_NSU"];
      const schema = docZip["@_schema"];

      console.log(`\n📄 Processando NSU ${nsu} (Tipo: ${schema})...`);

      // Decodifica Base64
      const compressedBuffer = Buffer.from(docZip["#text"], "base64");

      // Descompacta GZIP
      const xmlContent = zlib.gunzipSync(compressedBuffer).toString("utf-8");

      console.log(`✅ XML descompactado (${xmlContent.length} bytes)`);

      // Roteamento por tipo de documento
      if (schema?.startsWith("resNFe")) {
        // RESUMO de NFe - Apenas salva referência (não importa completo)
        console.log("📋 Resumo de NFe detectado (não será importado)");
        return Result.ok({ type: "resNFe", status: "IGNORED" });
      } else if (schema?.startsWith("procNFe")) {
        // NFE COMPLETA - Importa automaticamente!
        console.log("📥 NFe completa detectada! Importando...");

        const importResult = await this.importer.importNFe(xmlContent);

        if (Result.isOk(importResult)) {
          const status = importResult.value;
          console.log(
            status === "SUCCESS"
              ? "✅ NFe importada com sucesso!"
              : "⚠️  NFe duplicada (já existe no sistema)"
          );
          return Result.ok({ type: "procNFe", status });
        } else {
          throw importResult.error;
        }
      } else if (schema?.startsWith("resEvento")) {
        // EVENTO de NFe (Cancelamento, Manifestação, etc) - Ignorar por enquanto
        console.log("📋 Evento de NFe detectado (será ignorado)");
        return Result.ok({ type: "resEvento", status: "IGNORED" });
      } else if (schema?.startsWith("procCTe")) {
        // CTe COMPLETO (emitido externamente - Multicte/bsoft)
        console.log("🚚 CTe externo detectado! Importando...");

        const importResult = await this.importer.importCTe(xmlContent);

        if (Result.isOk(importResult)) {
          const status = importResult.value;
          console.log(
            status === "SUCCESS"
              ? "✅ CTe externo importado com sucesso!"
              : "⚠️  CTe duplicado (já existe no sistema)"
          );
          return Result.ok({ type: "procCTe", status });
        } else {
          throw importResult.error;
        }
      } else {
        console.log(`⚠️  Tipo de documento não suportado: ${schema}`);
        return Result.ok({ type: schema || "UNKNOWN", status: "IGNORED" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Erro ao processar documento:`, errorMessage);
      return Result.fail(new FiscalDocumentError(`Erro ao processar documento: ${errorMessage}`));
    }
  }
}

