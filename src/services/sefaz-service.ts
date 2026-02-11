// ============================================================================
// ⛔ READY FOR REMOVAL - E15.3
// Zero consumers detected. All functionality migrated to DDD modules.
// Safe to delete after E16 sprint verification.
// ============================================================================

/**
 * 🤖 SEFAZ SERVICE - Comunicação com Webservices da Receita Federal
 *
 * Serviços implementados:
 * - DistribuicaoDFe: Download de NFes destinadas à empresa (Ambiente Nacional)
 *
 * Tecnologias:
 * - SOAP/XML (Envelope padrão Sefaz)
 * - Certificado Digital A1 (mTLS)
 * - HTTPS com autenticação de cliente
 *
 * @deprecated Este arquivo está deprecated desde 20/01/2026 e será removido em versão futura.
 * A funcionalidade foi migrada para o módulo DDD: `src/modules/fiscal/`
 *
 * @see E7 DDD Migration
 * @since 2026-01-20
 */

import https from "https";
import axios from "axios";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * URLs dos Webservices Sefaz (Ambiente Nacional - AN)
 */
const SEFAZ_URLS = {
  HOMOLOGATION: "https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
  PRODUCTION: "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
};

/**
 * Classe principal do serviço Sefaz
 */
export class SefazService {
  private branchId: number;
  private organizationId: number;

  constructor(branchId: number, organizationId: number) {
    this.branchId = branchId;
    this.organizationId = organizationId;
  }

  /**
   * Busca o certificado digital da filial no banco
   */
  private async getCertificate(): Promise<{
    pfx: Buffer;
    password: string;
    lastNsu: string;
    environment: string;
    cnpj: string;
    uf: string;
  }> {
    const [branch] = await db
      .select()
      .from(branches)
      .where(
        and(
          eq(branches.id, this.branchId),
          eq(branches.organizationId, this.organizationId),
          isNull(branches.deletedAt)
        )
      );

    if (!branch) {
      throw new Error("Filial não encontrada");
    }

    if (!branch.certificatePfx || !branch.certificatePassword) {
      throw new Error("Certificado digital não configurado para esta filial. Faça o upload do .pfx primeiro.");
    }

    // Converte Base64 de volta para Buffer
    const pfxBuffer = Buffer.from(branch.certificatePfx, "base64");

    return {
      pfx: pfxBuffer,
      password: branch.certificatePassword,
      lastNsu: branch.lastNsu || "0",
      environment: branch.environment || "HOMOLOGATION",
      cnpj: branch.document.replace(/\D/g, ""),
      uf: branch.state || "GO",
    };
  }

  /**
   * Cria um HTTPS Agent com certificado digital (mTLS)
   */
  private createHttpsAgent(pfx: Buffer, password: string): https.Agent {
    return new https.Agent({
      pfx,
      passphrase: password,
      rejectUnauthorized: false, // ⚠️ Em produção, validar certificado da Sefaz
    });
  }

  /**
   * Monta o Envelope SOAP para DistribuicaoDFe
   * 
   * IMPORTANTE: Para consulta por CNPJ, usar cUFAutor = 91 (Ambiente Nacional)
   * segundo a documentação oficial da Sefaz
   */
  private buildDistribuicaoEnvelope(cnpj: string, ultNsu: string, environment: string, uf: string): string {
    // Garante que o CNPJ tenha 14 dígitos (preenche com zeros à esquerda)
    const cnpjPadded = cnpj.padStart(14, "0");
    
    // Garante que o NSU tenha 15 dígitos (preenche com zeros à esquerda)
    const nsuPadded = ultNsu.padStart(15, "0");
    
    // Define o tipo de ambiente: 1 = Produção, 2 = Homologação
    const tpAmb = environment === "PRODUCTION" ? "1" : "2";
    
    // Mapeia UF para código IBGE (para cUFAutor)
    const ufMap: Record<string, string> = {
      "RO": "11", "AC": "12", "AM": "13", "RR": "14", "PA": "15", "AP": "16", "TO": "17",
      "MA": "21", "PI": "22", "CE": "23", "RN": "24", "PB": "25", "PE": "26", "AL": "27", "SE": "28", "BA": "29",
      "MG": "31", "ES": "32", "RJ": "33", "SP": "35",
      "PR": "41", "SC": "42", "RS": "43",
      "MS": "50", "MT": "51", "GO": "52", "DF": "53"
    };
    
    const cUFAutor = ufMap[uf.toUpperCase()] || "91"; // 91 = Ambiente Nacional (fallback)

    // Limpeza rigorosa dos dados
    const cleanCnpj = cnpjPadded.replace(/\D/g, '');
    const cleanUf = cUFAutor.toString();
    const cleanNsu = nsuPadded.toString().padStart(15, '0');
    
    // XML Interno (COM A TAG distNSU ADICIONADA - OBRIGATÓRIA!)
    const innerXml = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${cleanUf}</cUFAutor><CNPJ>${cleanCnpj}</CNPJ><distNSU><ultNSU>${cleanNsu}</ultNSU></distNSU></distDFeInt>`;
    
    // Envelope SOAP MINIFICADO (SEM QUEBRAS DE LINHA)
    const soapRequest = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDadosMsg>${innerXml}</nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`;
    
    return soapRequest;
  }

  /**
   * 📥 DISTRIBUIÇÃO DFe - Baixa NFes da Sefaz
   * 
   * Consulta o webservice DistribuicaoDFe para baixar NFes destinadas à empresa.
   * Retorna os documentos fiscais a partir do último NSU processado.
   * 
   * @returns XML bruto da resposta da Sefaz
   */
  public async getDistribuicaoDFe(): Promise<{
    success: boolean;
    xml: string;
    maxNsu: string;
    totalDocuments: number;
    error?: {
      code: string;
      message: string;
      nextNsu?: string;
      waitMinutes?: number;
    };
  }> {
    try {
      console.log("🤖 Iniciando consulta DistribuicaoDFe na Sefaz...");

      // Busca certificado
      const cert = await this.getCertificate();

      console.log(`📜 Certificado carregado (${cert.pfx.length} bytes)`);
      console.log(`🔢 Último NSU processado: ${cert.lastNsu}`);
      console.log(`🌐 Ambiente: ${cert.environment}`);

      // Cria HTTPS Agent com certificado
      const httpsAgent = this.createHttpsAgent(cert.pfx, cert.password);

      // Seleciona URL conforme ambiente
      const url = cert.environment === "PRODUCTION" 
        ? SEFAZ_URLS.PRODUCTION 
        : SEFAZ_URLS.HOMOLOGATION;

      console.log(`📡 URL Sefaz: ${url}`);

      // Monta envelope SOAP com ambiente e UF corretos
      const soapEnvelope = this.buildDistribuicaoEnvelope(cert.cnpj, cert.lastNsu, cert.environment, cert.uf);

      console.log("📤 Enviando requisição para Sefaz...");
      console.log("📋 Envelope SOAP (REQUEST):");
      console.log(soapEnvelope);

      // Envia requisição SOAP
      const response = await axios.post(url, soapEnvelope, {
        httpsAgent,
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          "SOAPAction": "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse",
        },
        timeout: 30000, // 30 segundos
      });

      console.log("✅ Resposta recebida da Sefaz");
      console.log("📄 Tamanho da resposta:", response.data?.length || 0, "bytes");

      // Extrai o XML da resposta
      const responseXml = response.data;

      // Parse completo para extrair status e NSUs
      const cStatMatch = responseXml.match(/<cStat>(\d+)<\/cStat>/);
      const xMotivoMatch = responseXml.match(/<xMotivo>(.*?)<\/xMotivo>/);
      const ultNSUMatch = responseXml.match(/<ultNSU>(\d+)<\/ultNSU>/);
      const maxNSUMatch = responseXml.match(/<maxNSU>(\d+)<\/maxNSU>/);

      const cStat = cStatMatch ? cStatMatch[1] : null;
      const xMotivo = xMotivoMatch ? xMotivoMatch[1] : "Sem motivo";
      const ultNSU = ultNSUMatch ? ultNSUMatch[1] : cert.lastNsu;
      const maxNSU = maxNSUMatch ? maxNSUMatch[1] : "000000000000000";

      console.log(`📊 Status SEFAZ: ${cStat} - ${xMotivo}`);
      console.log(`🔢 ultNSU: ${ultNSU} | maxNSU: ${maxNSU}`);

      // Tratamento de erro 656 (Consumo Indevido)
      if (cStat === "656") {
        console.log("⚠️  ERRO 656 - Consumo Indevido detectado!");
        console.log("📋 Motivo:", xMotivo);
        console.log(`🔧 Atualizando NSU para ultNSU: ${ultNSU}`);

        // Atualiza NSU com o ultNSU informado pela SEFAZ
        await db
          .update(branches)
          .set({
            lastNsu: ultNSU,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(branches.id, this.branchId),
              eq(branches.organizationId, this.organizationId)
            )
          );

        console.log(`✅ NSU atualizado para: ${ultNSU}`);
        console.log("⏰ Aguarde 1 hora antes de nova consulta");

        return {
          success: false,
          xml: responseXml,
          maxNsu: ultNSU, // Retorna ultNSU como próximo NSU
          totalDocuments: 0,
          error: {
            code: "656",
            message: xMotivo,
            nextNsu: ultNSU,
            waitMinutes: 60,
          },
        };
      }

      // Status 137: Nenhum documento localizado (normal)
      if (cStat === "137") {
        console.log("ℹ️  Nenhum documento novo disponível");
        console.log(`🔢 Mantendo NSU: ${ultNSU}`);

        return {
          success: true,
          xml: responseXml,
          maxNsu: ultNSU,
          totalDocuments: 0,
        };
      }

      // Status 138: Documentos localizados
      if (cStat !== "138") {
        console.log(`⚠️  Status inesperado: ${cStat} - ${xMotivo}`);
        return {
          success: false,
          xml: responseXml,
          maxNsu: ultNSU,
          totalDocuments: 0,
          error: {
            code: cStat || "unknown",
            message: xMotivo,
          },
        };
      }

      // Conta quantos documentos vieram
      const docZipMatches = responseXml.match(/<docZip/g);
      const totalDocuments = docZipMatches ? docZipMatches.length : 0;

      console.log(`📊 Documentos retornados: ${totalDocuments}`);
      console.log(`🔢 Novo maxNSU: ${maxNSU}`);

      // Atualiza o lastNsu da filial (apenas se maxNSU for válido)
      if (maxNSU !== "000000000000000" && maxNSU !== cert.lastNsu) {
        await db
          .update(branches)
          .set({
            lastNsu: maxNSU,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(branches.id, this.branchId),
              eq(branches.organizationId, this.organizationId)
            )
          );

        console.log(`✅ NSU atualizado: ${cert.lastNsu} → ${maxNSU}`);
      }

      return {
        success: true,
        xml: responseXml,
        maxNsu: maxNSU, // ✅ Corrigido: maxNSU (maiúscula)
        totalDocuments,
      };

    } catch (error: unknown) {
      let errorMessage = 'Erro desconhecido';
      
      // Type guard para Error padrão
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error("❌ Erro ao consultar Sefaz:", errorMessage);

      // Type guard para Axios error (resposta da Sefaz)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        if (axiosError.response?.data) {
          console.error("📄 Resposta Sefaz:", axiosError.response.data);
        }
      }

      throw new Error(`Falha ao comunicar com Sefaz: ${errorMessage}`);
    }
  }

  /**
   * 🔄 PROCESSAMENTO DE DOCUMENTOS DISTRIBUÍDOS
   * 
   * Processa os documentos retornados pela DistribuicaoDFe:
   * - Descompacta os arquivos GZip (docZip)
   * - Extrai os XMLs das NFes
   * - Importa automaticamente no sistema
   * 
   * TODO: Implementar no próximo passo
   */
  public async processDistributedDocuments(_responseXml: string): Promise<{
    processed: number;
    imported: number;
    errors: number;
  }> {
    // TODO: Implementar descompactação GZIP e importação automática
    console.log("⚠️  Processamento de documentos ainda não implementado");
    
    return {
      processed: 0,
      imported: 0,
      errors: 0,
    };
  }
}

/**
 * Helper: Cria instância do serviço
 */
export function createSefazService(branchId: number, organizationId: number): SefazService {
  return new SefazService(branchId, organizationId);
}

/**
 * 🤖 Função auxiliar para download e processamento automático de NFes
 * Usada pelo cron job de importação automática
 */
export async function downloadNFesFromSefaz(
  organizationId: number,
  branchId: number,
  cnpj: string,
  userId: string
): Promise<{ success: boolean; imported: number; totalDocuments: number; error?: string; duplicates?: number; totalValue?: number; sefazStatus?: string }> {
  try {
    const { processSefazResponse } = await import("@/services/sefaz-processor");
    const sefazService = createSefazService(branchId, organizationId);
    const downloadResult = await sefazService.getDistribuicaoDFe();

    console.log(`📦 Documentos recebidos da SEFAZ: ${downloadResult.totalDocuments}`);

    if (downloadResult.error) {
      console.log(`⚠️  Erro SEFAZ: ${downloadResult.error.code} - ${downloadResult.error.message}`);
      return {
        success: false,
        imported: 0,
        totalDocuments: 0,
        error: `${downloadResult.error.code} - ${downloadResult.error.message}`,
        sefazStatus: downloadResult.error.code,
      };
    }

    let imported = 0;
    if (downloadResult.totalDocuments > 0) {
      console.log("🤖 Processando documentos automaticamente...");
      try {
        const processResult = await processSefazResponse(
          downloadResult.xml,
          organizationId,
          branchId,
          userId
        );
        imported = processResult.imported || 0;
        console.log(`✅ ${imported} documento(s) importado(s) com sucesso!`);
        // Retornar também duplicates e totalValue se disponíveis
        return { 
          success: true, 
          imported, 
          totalDocuments: downloadResult.totalDocuments,
          duplicates: processResult.duplicates,
          totalValue: 0 // TODO: Calcular totalValue dos documentos importados
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("❌ Erro ao processar documentos:", errorMessage);
        return { success: false, imported: 0, totalDocuments: downloadResult.totalDocuments, error: `Erro no processamento: ${errorMessage}` };
      }
    }

    return { success: true, imported, totalDocuments: downloadResult.totalDocuments };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Erro ao baixar NFes da SEFAZ:", errorMessage);
    return { success: false, imported: 0, totalDocuments: 0, error: errorMessage };
  }
}

