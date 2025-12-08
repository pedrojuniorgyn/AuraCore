import https from "https";
import axios from "axios";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

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
 */

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

      // Parse básico para extrair informações (sem processar os documentos ainda)
      // Em produção, fazer parse completo do retDistDFeInt
      const maxNsuMatch = responseXml.match(/<maxNSU>(\d+)<\/maxNSU>/);
      const maxNsu = maxNsuMatch ? maxNsuMatch[1] : cert.lastNsu;

      // Conta quantos documentos vieram
      const docZipMatches = responseXml.match(/<docZip/g);
      const totalDocuments = docZipMatches ? docZipMatches.length : 0;

      console.log(`📊 Documentos retornados: ${totalDocuments}`);
      console.log(`🔢 Novo maxNSU: ${maxNsu}`);

      // Atualiza o lastNsu da filial (se houver novos documentos)
      if (totalDocuments > 0 && maxNsu !== cert.lastNsu) {
        await db
          .update(branches)
          .set({
            lastNsu: maxNsu,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(branches.id, this.branchId),
              eq(branches.organizationId, this.organizationId)
            )
          );

        console.log(`✅ NSU atualizado: ${cert.lastNsu} → ${maxNsu}`);
      }

      return {
        success: true,
        xml: responseXml,
        maxNsu,
        totalDocuments,
      };

    } catch (error: any) {
      console.error("❌ Erro ao consultar Sefaz:", error.message);

      if (error.response) {
        console.error("📄 Resposta Sefaz:", error.response.data);
      }

      throw new Error(`Falha ao comunicar com Sefaz: ${error.message}`);
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
  public async processDistributedDocuments(responseXml: string): Promise<{
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

