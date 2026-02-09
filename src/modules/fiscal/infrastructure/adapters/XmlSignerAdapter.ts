/**
 * XmlSignerAdapter - Infrastructure Adapter
 *
 * Adapta o servico legacy de assinatura XML
 * para a interface do Domain Port IXmlSignerService.
 *
 * @see ARCH-011: Implementa interface de domain/ports/output/
 * @see IXmlSignerService
 */
import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type { IXmlSignerService, CertificateInfo } from '../../domain/ports/output/IXmlSignerService';
import { createXmlSignerFromDb } from '@/services/fiscal/xml-signer';

@injectable()
export class XmlSignerAdapter implements IXmlSignerService {
  async verifyCertificate(organizationId: number): Promise<Result<CertificateInfo, string>> {
    try {
      const signer = await createXmlSignerFromDb(organizationId);
      const info = signer.verifyCertificate();
      return Result.ok({
        valid: info.valid,
        expiresAt: info.expiresAt,
        subject: info.cn,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao verificar certificado: ${message}`);
    }
  }

  async signCteXml(xml: string, organizationId: number): Promise<Result<string, string>> {
    try {
      const signer = await createXmlSignerFromDb(organizationId);
      const signedXml = signer.signCteXml(xml);
      return Result.ok(signedXml);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao assinar XML: ${message}`);
    }
  }
}
