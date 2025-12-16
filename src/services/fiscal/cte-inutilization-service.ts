import { SefazCTeClient } from "./sefaz-cte-client";
import { db } from "@/lib/db";
import { cteInutilization, fiscalSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createXmlSignerFromDb } from "./xml-signer";

export interface InutilizationData {
  organizationId: number;
  branchId: number;
  serie: string;
  numberFrom: number;
  numberTo: number;
  year: number;
  justification: string;
  userId: string;
}

export interface InutilizationResult {
  success: boolean;
  protocol?: string;
  message?: string;
}

/**
 * Serviço para inutilização de numeração de CTe
 */
export class CTeInutilizationService {
  /**
   * Inutilizar numeração na Sefaz
   */
  public async inutilizar(data: InutilizationData): Promise<InutilizationResult> {
    try {
      console.log(`🚫 Inutilizando CTe série ${data.serie}, números ${data.numberFrom} a ${data.numberTo}...`);

      // 1. Validações
      if (data.justification.length < 15) {
        return {
          success: false,
          message: "Justificativa deve ter no mínimo 15 caracteres",
        };
      }

      // 2. Buscar configurações (ambiente)
      const [settings] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, data.organizationId),
            eq(fiscalSettings.branchId, data.branchId)
          )
        );

      const environment = settings?.cteEnvironment === "production" ? "production" : "homologacao";

      // 3. Gerar XML de inutilização
      const xmlInutilizacao = this.buildInutilizationXml(data);

      // 4. Assinar XML
      const signer = await createXmlSignerFromDb(data.organizationId);
      const xmlAssinado = signer.signCteXml(xmlInutilizacao);

      // 5. Enviar para Sefaz
      const client = new SefazCTeClient(await this.getUF(data.organizationId), environment);
      const resultado = await client.inutilizarCTe(
        data.serie,
        data.numberFrom,
        data.numberTo,
        data.year,
        data.justification,
        xmlAssinado
      );

      // 6. Registrar no banco
      await db
        .insert(cteInutilization)
        .values({
          organizationId: data.organizationId,
          branchId: data.branchId,
          serie: data.serie,
          numberFrom: data.numberFrom,
          numberTo: data.numberTo,
          year: data.year,
          justification: data.justification,
          protocolNumber: resultado.protocol,
          status: resultado.success ? "CONFIRMED" : "REJECTED",
          sefazReturnMessage: resultado.message,
          inutilizedAt: resultado.success ? new Date() : null,
          createdBy: data.userId,
        })
        .$returningId();

      console.log(resultado.success ? "✅ Inutilização confirmada!" : "❌ Inutilização rejeitada");

      return resultado;
    } catch (error: any) {
      console.error("❌ Erro ao inutilizar:", error);
      return {
        success: false,
        message: `Erro: ${error.message}`,
      };
    }
  }

  /**
   * Construir XML de inutilização
   */
  private buildInutilizationXml(data: InutilizationData): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<inutCTe versao="3.00" xmlns="http://www.portalfiscal.inf.br/cte">
  <infInut>
    <tpAmb>2</tpAmb>
    <xServ>INUTILIZAR</xServ>
    <cUF>35</cUF>
    <ano>${data.year.toString().substring(2)}</ano>
    <CNPJ>00000000000000</CNPJ>
    <mod>57</mod>
    <serie>${data.serie}</serie>
    <nCTIni>${data.numberFrom}</nCTIni>
    <nCTFin>${data.numberTo}</nCTFin>
    <xJust>${data.justification}</xJust>
  </infInut>
</inutCTe>`;
  }

  /**
   * Obter UF da organização
   */
  private async getUF(organizationId: number): Promise<string> {
    // TODO: Buscar UF da empresa no banco
    return "SP";
  }
}

// Singleton
export const cteInutilizationService = new CTeInutilizationService();
















