import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  ISefazGateway,
  AuthorizeCteRequest,
  AuthorizeCteResponse,
  CancelCteRequest,
  QueryNfeRequest,
  NfeDistribuicaoResponse,
  ManifestNfeRequest,
  AuthorizeMdfeResponse,
} from '../../../domain/ports/output/ISefazGateway';

// Importar serviço SEFAZ existente
import { sendCteToSefaz, type SefazConfig } from '@/services/fiscal/sefaz-client';

/**
 * SefazGatewayAdapter - Implementação real da comunicação com SEFAZ
 * 
 * E7.9 Integrações - Semana 2
 * 
 * Delega para src/services/fiscal/sefaz-client.ts que já possui:
 * - Endpoints por UF
 * - Assinatura XML com certificado digital
 * - SOAP envelope
 * - Tratamento de erros
 * 
 * ⚠️ STATUS: Implementação parcial
 * - authorizeCte: ✅ Implementado
 * - cancelCte: ⚠️ TODO (requires SEFAZ client extension)
 * - queryCteStatus: ⚠️ TODO
 * - queryDistribuicaoDFe: ⚠️ TODO
 * - manifestNfe: ⚠️ TODO
 * - authorizeMdfe: ⚠️ TODO
 * - closeMdfe: ⚠️ TODO
 * 
 * NOTA: Métodos não implementados retornam error descritivo ao invés de mock.
 */
@injectable()
export class SefazGatewayAdapter implements ISefazGateway {
  // ========== CTe Methods ==========

  async authorizeCte(request: AuthorizeCteRequest): Promise<Result<AuthorizeCteResponse, string>> {
    try {
      // Mapear para formato do sefaz-client
      const sefazConfig: SefazConfig = {
        environment: request.environment,
        uf: request.uf,
        // certificado é obtido automaticamente via getDefaultCertificateConfig()
      };

      // Chamar serviço SEFAZ
      const response = await sendCteToSefaz(request.cteXml, sefazConfig);

      // Mapear resposta
      return Result.ok({
        success: response.success,
        protocolNumber: response.protocolNumber,
        authorizationDate: response.authorizationDate,
        cteKey: response.cteKey,
        rejectionCode: response.rejectionCode,
        rejectionMessage: response.rejectionMessage,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`SEFAZ_AUTHORIZE_CTE_FAILED: ${message}`);
    }
  }

  async cancelCte(request: CancelCteRequest): Promise<Result<void, string>> {
    // TODO: E7.9 Semana 2 - Implementar cancelamento de CTe
    // Requer extensão do sefaz-client.ts para suportar evento de cancelamento
    return Result.fail(
      'SEFAZ_CANCEL_NOT_IMPLEMENTED: CTe cancellation requires SEFAZ client extension. ' +
      'Implementation needed: sendCancellationEvent(cteKey, protocol, justification, environment)'
    );
  }

  async queryCteStatus(
    cteKey: string,
    environment: 'production' | 'homologation'
  ): Promise<Result<string, string>> {
    // TODO: E7.9 Semana 2 - Implementar consulta de status de CTe
    // Requer extensão do sefaz-client.ts para suportar consulta
    return Result.fail(
      'SEFAZ_QUERY_NOT_IMPLEMENTED: CTe status query requires SEFAZ client extension. ' +
      'Implementation needed: queryCteStatus(cteKey, environment)'
    );
  }

  // ========== NFe Methods ==========

  async queryDistribuicaoDFe(request: QueryNfeRequest): Promise<Result<NfeDistribuicaoResponse[], string>> {
    // TODO: E7.9 Semana 2 - Implementar consulta de distribuição DFe
    // Requer implementação no sefaz-client.ts
    return Result.fail(
      'SEFAZ_DFE_NOT_IMPLEMENTED: DFe distribution query requires SEFAZ client extension. ' +
      'Implementation needed: queryDistribuicaoDFe(cnpj, lastNsu, environment)'
    );
  }

  async manifestNfe(request: ManifestNfeRequest): Promise<Result<void, string>> {
    // TODO: E7.9 Semana 2 - Implementar manifestação de NFe
    // Requer implementação no sefaz-client.ts
    return Result.fail(
      'SEFAZ_MANIFEST_NOT_IMPLEMENTED: NFe manifestation requires SEFAZ client extension. ' +
      'Implementation needed: manifestNfe(nfeKey, eventType, justification, environment)'
    );
  }

  // ========== MDFe Methods ==========

  async authorizeMdfe(
    mdfeXml: string,
    environment: 'production' | 'homologation'
  ): Promise<Result<AuthorizeMdfeResponse, string>> {
    // TODO: E7.9 Semana 2 - Implementar autorização de MDFe
    // Requer extensão do sefaz-client.ts (similar ao CTe)
    return Result.fail(
      'SEFAZ_MDFE_NOT_IMPLEMENTED: MDFe authorization requires SEFAZ client extension. ' +
      'Implementation needed: sendMdfeToSefaz(mdfeXml, config)'
    );
  }

  async closeMdfe(
    mdfeKey: string,
    environment: 'production' | 'homologation'
  ): Promise<Result<void, string>> {
    // TODO: E7.9 Semana 2 - Implementar encerramento de MDFe
    // Requer extensão do sefaz-client.ts
    return Result.fail(
      'SEFAZ_CLOSE_MDFE_NOT_IMPLEMENTED: MDFe closure requires SEFAZ client extension. ' +
      'Implementation needed: closeMdfeEvent(mdfeKey, environment)'
    );
  }
}
