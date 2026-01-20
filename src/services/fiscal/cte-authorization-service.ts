/**
 * Serviço para autorização de CTe na Sefaz
 * Orquestra: Assinatura → Envio → Armazenamento
 *
 * @deprecated Este arquivo está deprecated desde 20/01/2026 e será removido em versão futura.
 * A funcionalidade foi migrada para o módulo DDD: `src/modules/fiscal/`
 *
 * @see E7 DDD Migration
 * @since 2026-01-20
 */

import { createXmlSignerFromDb } from "./xml-signer";
import { SefazCTeClient, CTeAutorizacaoResponse } from "./sefaz-cte-client";
import { db } from "@/lib/db";
import { cteHeader, fiscalSettings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export interface CTeAuthorizationResult extends CTeAutorizacaoResponse {
  cteId?: number;
}
export class CTeAuthorizationService {
  /**
   * Autorizar CTe na Sefaz
   * @param cteId ID do CTe no banco
   * @param xmlSemAssinatura XML do CTe gerado
   */
  public async autorizarCTe(
    cteId: number,
    xmlSemAssinatura: string,
    organizationId: number,
    branchId: number
  ): Promise<CTeAuthorizationResult> {
    try {
      console.log(`🚀 Iniciando autorização do CTe #${cteId}...`);

      // 1. Buscar configurações fiscais (ambiente)
      const [settings] = await db
        .select()
        .from(fiscalSettings)
        .where(
          and(
            eq(fiscalSettings.organizationId, organizationId),
            eq(fiscalSettings.branchId, branchId)
          )
        );

      const environment = settings?.cteEnvironment === "production" ? "production" : "homologacao";

      console.log(`📋 Ambiente: ${environment}`);

      // 2. Assinar XML
      console.log("🔐 Assinando XML...");
      const signer = await createXmlSignerFromDb(organizationId);

      // Verificar certificado
      const certInfo = signer.verifyCertificate();
      if (!certInfo.valid) {
        return {
          success: false,
          motivo: "Certificado digital inválido ou vencido",
          cteId,
        };
      }

      console.log(`✅ Certificado válido (CN: ${certInfo.cn}, vence em ${certInfo.expiresAt})`);

      const xmlAssinado = signer.signCteXml(xmlSemAssinatura);
      console.log("✅ XML assinado com sucesso");

      // 3. Extrair UF do emitente do XML
      const ufMatch = xmlSemAssinatura.match(/<enderEmit>[\s\S]*?<UF>(.*?)<\/UF>/);
      const uf = ufMatch?.[1] || "SP"; // Default SP

      // 4. Enviar para Sefaz
      console.log(`📤 Enviando para Sefaz ${uf}...`);
      const client = new SefazCTeClient(uf, environment);
      const resultado = await client.enviarCTe(xmlAssinado);

      // 5. Atualizar status no banco
      if (resultado.success) {
        await db
          .update(cteHeader)
          .set({
            cteKey: resultado.chaveAcesso,
            protocolNumber: resultado.numeroProtocolo,
            status: "AUTHORIZED",
            authorizationDate: resultado.dataAutorizacao ? new Date(resultado.dataAutorizacao) : new Date(),
            xmlSigned: xmlAssinado,
            xmlAuthorized: xmlAssinado, // Mesmo XML (poderia adicionar protocolo depois)
            updatedAt: new Date(),
          })
          .where(eq(cteHeader.id, cteId));

        console.log("✅ CTe autorizado na Sefaz!");
        console.log(`   Chave: ${resultado.chaveAcesso}`);
        console.log(`   Protocolo: ${resultado.numeroProtocolo}`);
      } else {
        await db
          .update(cteHeader)
          .set({
            status: "REJECTED",
            rejectionCode: resultado.status,
            rejectionMessage: resultado.motivo,
            updatedAt: new Date(),
          })
          .where(eq(cteHeader.id, cteId));

        console.error("❌ CTe rejeitado pela Sefaz:");
        console.error(`   Motivo: ${resultado.motivo}`);
      }

      return {
        ...resultado,
        cteId,
      };
    } catch (error: unknown) {
      console.error("❌ Erro ao autorizar CTe:", error);

      // Atualizar status como erro
      await db
        .update(cteHeader)
        .set({
          status: "REJECTED",
          rejectionMessage: (error instanceof Error ? error.message : String(error)),
          updatedAt: new Date(),
        })
        .where(eq(cteHeader.id, cteId));

      return {
        success: false,
        motivo: `Erro interno: ${(error instanceof Error ? error.message : String(error))}`,
        cteId,
      };
    }
  }

  /**
   * Consultar status de CTe na Sefaz
   */
  public async consultarCTe(chaveAcesso: string, uf: string): Promise<CTeAutorizacaoResponse> {
    try {
      console.log(`🔍 Consultando CTe ${chaveAcesso} na Sefaz ${uf}...`);

      // Determinar ambiente
      const environment = process.env.CTE_ENVIRONMENT === "production" ? "production" : "homologacao";

      const client = new SefazCTeClient(uf, environment);
      const resultado = await client.consultarCTe(chaveAcesso);

      return resultado;
    } catch (error: unknown) {
      console.error("❌ Erro ao consultar CTe:", error);
      return {
        success: false,
        motivo: `Erro interno: ${(error instanceof Error ? error.message : String(error))}`,
      };
    }
  }

  /**
   * Cancelar CTe na Sefaz
   */
  public async cancelarCTe(
    cteId: number,
    justificativa: string,
    organizationId: number
  ): Promise<CTeAutorizacaoResponse> {
    try {
      console.log(`❌ Cancelando CTe #${cteId}...`);

      // Buscar CTe
      const [cte] = await db
        .select()
        .from(cteHeader)
        .where(eq(cteHeader.id, cteId));

      if (!cte) {
        return {
          success: false,
          motivo: "CTe não encontrado",
        };
      }

      if (cte.status !== "AUTHORIZED") {
        return {
          success: false,
          motivo: "CTe não está autorizado, não pode ser cancelado",
        };
      }

      if (!cte.cteKey || !cte.protocolNumber) {
        return {
          success: false,
          motivo: "CTe sem chave ou protocolo",
        };
      }

      // Extrair UF
      const uf = cte.cteKey.substring(0, 2); // Primeiros 2 dígitos da chave

      // Determinar ambiente
      const environment = process.env.CTE_ENVIRONMENT === "production" ? "production" : "homologacao";

      const client = new SefazCTeClient(uf, environment);
      const resultado = await client.cancelarCTe(cte.cteKey, cte.protocolNumber, justificativa);

      // Atualizar status
      if (resultado.success) {
        await db
          .update(cteHeader)
          .set({
            status: "CANCELLED",
            cancellationReason: justificativa,
            cancellationDate: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(cteHeader.id, cteId));

        console.log("✅ CTe cancelado na Sefaz!");
      }

      return resultado;
    } catch (error: unknown) {
      console.error("❌ Erro ao cancelar CTe:", error);
      return {
        success: false,
        motivo: `Erro interno: ${(error instanceof Error ? error.message : String(error))}`,
      };
    }
  }
}

// Singleton
export const cteAuthorizationService = new CTeAuthorizationService();

