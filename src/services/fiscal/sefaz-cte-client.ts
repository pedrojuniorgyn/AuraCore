/**
 * @deprecated Este arquivo está deprecated desde 20/01/2026 e será removido em versão futura.
 * A funcionalidade foi migrada para o módulo DDD: `src/modules/fiscal/`
 * Use ISefazClient via DI Container.
 *
 * @see E7 DDD Migration
 * @since 2026-01-20
 */

import * as soap from "soap";
import { DOMParser, XMLSerializer } from "xmldom";

/**
 * Helper para extrair texto de XML de forma segura
 */
function getXMLText(xmlDoc: Document, tagName: string): string | undefined {
  const elements = xmlDoc.getElementsByTagName(tagName);
  const element = elements[0];
  return element?.textContent || undefined;
}

/**
 * URLs dos Webservices Sefaz CTe
 * Documentação: https://www.cte.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=E4+hIudXkjM=
 */
const SEFAZ_CTE_URLS = {
  // SVRS (Sefaz Virtual do Rio Grande do Sul - atende vários estados)
  SVRS: {
    production: {
      recepcao: "https://cte.svrs.rs.gov.br/ws/cterecepcao/CteRecepcao.asmx?wsdl",
      retRecepcao: "https://cte.svrs.rs.gov.br/ws/cteretrecepcao/CTeRetRecepcao.asmx?wsdl",
      consulta: "https://cte.svrs.rs.gov.br/ws/cteconsulta/CteConsulta.asmx?wsdl",
      cancelamento: "https://cte.svrs.rs.gov.br/ws/cterecepcaoevento/cterecepcaoevento.asmx?wsdl",
      inutilizacao: "https://cte.svrs.rs.gov.br/ws/cteinutilizacao/cteinutilizacao.asmx?wsdl",
    },
    homologacao: {
      recepcao: "https://cte-homologacao.svrs.rs.gov.br/ws/cterecepcao/CteRecepcao.asmx?wsdl",
      retRecepcao: "https://cte-homologacao.svrs.rs.gov.br/ws/cteretrecepcao/CTeRetRecepcao.asmx?wsdl",
      consulta: "https://cte-homologacao.svrs.rs.gov.br/ws/cteconsulta/CteConsulta.asmx?wsdl",
      cancelamento: "https://cte-homologacao.svrs.rs.gov.br/ws/cterecepcaoevento/cterecepcaoevento.asmx?wsdl",
      inutilizacao: "https://cte-homologacao.svrs.rs.gov.br/ws/cteinutilizacao/cteinutilizacao.asmx?wsdl",
    },
  },

  // SP (São Paulo)
  SP: {
    production: {
      recepcao: "https://cte.fazenda.sp.gov.br/ws/cterecepcao.asmx?wsdl",
      retRecepcao: "https://cte.fazenda.sp.gov.br/ws/cteretrecepcao.asmx?wsdl",
      consulta: "https://cte.fazenda.sp.gov.br/ws/cteconsulta.asmx?wsdl",
      cancelamento: "https://cte.fazenda.sp.gov.br/ws/cterecepcaoevento.asmx?wsdl",
      inutilizacao: "https://cte.fazenda.sp.gov.br/ws/cteinutilizacao.asmx?wsdl",
    },
    homologacao: {
      recepcao: "https://homologacao.cte.fazenda.sp.gov.br/ws/cterecepcao.asmx?wsdl",
      retRecepcao: "https://homologacao.cte.fazenda.sp.gov.br/ws/cteretrecepcao.asmx?wsdl",
      consulta: "https://homologacao.cte.fazenda.sp.gov.br/ws/cteconsulta.asmx?wsdl",
      cancelamento: "https://homologacao.cte.fazenda.sp.gov.br/ws/cterecepcaoevento.asmx?wsdl",
      inutilizacao: "https://homologacao.cte.fazenda.sp.gov.br/ws/cteinutilizacao.asmx?wsdl",
    },
  },
};

/**
 * Mapa de UF para webservice
 * Estados que usam SVRS
 */
const UF_TO_WEBSERVICE: Record<string, keyof typeof SEFAZ_CTE_URLS> = {
  AC: "SVRS",
  AL: "SVRS",
  AM: "SVRS",
  AP: "SVRS",
  BA: "SVRS",
  DF: "SVRS",
  ES: "SVRS",
  GO: "SVRS",
  MA: "SVRS",
  MG: "SVRS",
  MS: "SVRS",
  MT: "SVRS",
  PA: "SVRS",
  PB: "SVRS",
  PE: "SVRS",
  PI: "SVRS",
  PR: "SVRS",
  RJ: "SVRS",
  RN: "SVRS",
  RO: "SVRS",
  RR: "SVRS",
  RS: "SVRS",
  SC: "SVRS",
  SE: "SVRS",
  SP: "SP",
  TO: "SVRS",
};

export interface CTeAutorizacaoResponse {
  success: boolean;
  protocolo?: string;
  chaveAcesso?: string;
  numeroProtocolo?: string;
  dataAutorizacao?: string;
  xmlAutorizado?: string;
  status?: string;
  motivo?: string;
  rejeicoes?: string[];
}

/**
 * Client para comunicação com webservices da Sefaz CTe
 */
export class SefazCTeClient {
  private uf: string;
  private environment: "production" | "homologacao";

  constructor(uf: string, environment: "production" | "homologacao" = "homologacao") {
    this.uf = uf;
    this.environment = environment;
  }

  /**
   * Obter URL do webservice para a UF/ambiente
   */
  private getWebserviceUrl(servico: "recepcao" | "consulta" | "cancelamento" | "inutilizacao"): string {
    const webservice = UF_TO_WEBSERVICE[this.uf] || "SVRS";
    const urls = SEFAZ_CTE_URLS[webservice][this.environment];
    return urls[servico];
  }

  /**
   * Enviar CTe para autorização
   * @param xmlAssinado XML do CTe já assinado digitalmente
   */
  public async enviarCTe(xmlAssinado: string): Promise<CTeAutorizacaoResponse> {
    try {
      console.log(`📤 Enviando CTe para Sefaz ${this.uf} (${this.environment})...`);

      const url = this.getWebserviceUrl("recepcao");

      // Criar client SOAP
      const client = await soap.createClientAsync(url, {
        disableCache: true,
      });

      // Preparar envelope SOAP
      const envelope = `
        <cteDadosMsg xmlns="http://www.portalfiscal.inf.br/cte/wsdl/CteRecepcao">
          ${xmlAssinado}
        </cteDadosMsg>
      `;

      // Chamar método do webservice
      const [result] = await client.cteRecepcaoLoteAsync({ xml: envelope });

      // Parse da resposta
      const parser = new DOMParser();
      const xmlResponse = parser.parseFromString(result.cteRecepcaoLoteResult, "text/xml");

      // Extrair informações
      const cStat = getXMLText(xmlResponse, "cStat");
      const xMotivo = getXMLText(xmlResponse, "xMotivo");

      if (cStat === "100" || cStat === "104") {
        // 100 = Autorizado, 104 = Lote processado
        const nProt = getXMLText(xmlResponse, "nProt");
        const chCTe = getXMLText(xmlResponse, "chCTe");
        const dhRecbto = getXMLText(xmlResponse, "dhRecbto");

        return {
          success: true,
          status: cStat,
          motivo: xMotivo || "CTe autorizado",
          protocolo: nProt || undefined,
          chaveAcesso: chCTe || undefined,
          numeroProtocolo: nProt || undefined,
          dataAutorizacao: dhRecbto || undefined,
        };
      } else {
        // Rejeição
        return {
          success: false,
          status: cStat || "000",
          motivo: xMotivo || "Erro desconhecido",
          rejeicoes: [xMotivo || "Erro desconhecido"],
        };
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Erro desconhecido';
      console.error("❌ Erro ao enviar CTe:", error);
      return {
        success: false,
        motivo: `Erro de comunicação: ${errorMessage}`,
      };
    }
  }

  /**
   * Consultar CTe pela chave de acesso
   */
  public async consultarCTe(chaveAcesso: string): Promise<CTeAutorizacaoResponse> {
    try {
      console.log(`🔍 Consultando CTe ${chaveAcesso}...`);

      const url = this.getWebserviceUrl("consulta");
      const client = await soap.createClientAsync(url, { disableCache: true });

      const envelope = `
        <consSitCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="3.00">
          <tpAmb>${this.environment === "production" ? "1" : "2"}</tpAmb>
          <xServ>CONSULTAR</xServ>
          <chCTe>${chaveAcesso}</chCTe>
        </consSitCTe>
      `;

      const [result] = await client.cteConsultaCTAsync({ xml: envelope });

      const parser = new DOMParser();
      const xmlResponse = parser.parseFromString(result.cteConsultaCTResult, "text/xml");

      const cStat = getXMLText(xmlResponse, "cStat");
      const xMotivo = getXMLText(xmlResponse, "xMotivo");

      return {
        success: cStat === "100",
        status: cStat || "000",
        motivo: xMotivo || "Status desconhecido",
      };
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Erro desconhecido';
      console.error("❌ Erro ao consultar CTe:", error);
      return {
        success: false,
        motivo: `Erro de comunicação: ${errorMessage}`,
      };
    }
  }

  /**
   * Inutilizar numeração de CTe
   */
  public async inutilizarCTe(
    serie: string,
    numeroInicial: number,
    numeroFinal: number,
    ano: number,
    justificativa: string,
    xmlAssinado: string
  ): Promise<CTeAutorizacaoResponse> {
    try {
      console.log(`🚫 Inutilizando CTe série ${serie}, números ${numeroInicial}-${numeroFinal}...`);

      const url = this.getWebserviceUrl("inutilizacao");
      const client = await soap.createClientAsync(url, { disableCache: true });

      const [result] = await client.cteInutilizacaoAsync({ xml: xmlAssinado });

      const parser = new DOMParser();
      const xmlResponse = parser.parseFromString(result.cteInutilizacaoResult, "text/xml");

      const cStat = getXMLText(xmlResponse, "cStat");
      const xMotivo = getXMLText(xmlResponse, "xMotivo");
      const nProt = getXMLText(xmlResponse, "nProt");

      return {
        success: cStat === "102", // 102 = Inutilização homologada
        status: cStat || "000",
        motivo: xMotivo || "Status desconhecido",
        protocolo: nProt,
      };
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Erro desconhecido';
      console.error("❌ Erro ao inutilizar:", error);
      return {
        success: false,
        motivo: `Erro de comunicação: ${errorMessage}`,
      };
    }
  }

  /**
   * Cancelar CTe
   */
  public async cancelarCTe(
    chaveAcesso: string,
    protocolo: string,
    justificativa: string
  ): Promise<CTeAutorizacaoResponse> {
    try {
      console.log(`❌ Cancelando CTe ${chaveAcesso}...`);

      if (justificativa.length < 15) {
        return {
          success: false,
          motivo: "Justificativa deve ter no mínimo 15 caracteres",
        };
      }

      const url = this.getWebserviceUrl("cancelamento");
      const client = await soap.createClientAsync(url, { disableCache: true });

      const envelope = `
        <eventoCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="3.00">
          <infEvento>
            <chCTe>${chaveAcesso}</chCTe>
            <tpEvento>110111</tpEvento>
            <nSeqEvento>1</nSeqEvento>
            <detEvento versao="3.00">
              <evCancCTe>
                <descEvento>Cancelamento</descEvento>
                <nProt>${protocolo}</nProt>
                <xJust>${justificativa}</xJust>
              </evCancCTe>
            </detEvento>
          </infEvento>
        </eventoCTe>
      `;

      const [result] = await client.cteRecepcaoEventoAsync({ xml: envelope });

      const parser = new DOMParser();
      const xmlResponse = parser.parseFromString(result.cteRecepcaoEventoResult, "text/xml");

      const cStat = getXMLText(xmlResponse, "cStat");
      const xMotivo = getXMLText(xmlResponse, "xMotivo");

      return {
        success: cStat === "135" || cStat === "136", // 135 = Cancelamento homologado, 136 = Cancelado
        status: cStat || "000",
        motivo: xMotivo || "Status desconhecido",
      };
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Erro desconhecido';
      console.error("❌ Erro ao cancelar CTe:", error);
      return {
        success: false,
        motivo: `Erro de comunicação: ${errorMessage}`,
      };
    }
  }
}

