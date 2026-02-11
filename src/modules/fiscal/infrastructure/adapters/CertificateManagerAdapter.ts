/**
 * CertificateManagerAdapter - Infrastructure Adapter
 *
 * Encapsula o legacy certificate-manager.ts e implementa ICertificateManagerService.
 * Converte throws do servico legado em Result pattern.
 *
 * @module fiscal/infrastructure/adapters
 * @see ARCH-011: Implementa interface de domain/ports/output/
 * @since E10.3
 */
import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  ICertificateManagerService,
  CertificateManagerInfo,
} from '../../domain/ports/output/ICertificateManagerService';
import {
  loadCertificate,
  signXml,
  validateCertificate,
  getDefaultCertificateConfig,
} from '@/services/fiscal/certificate-manager';

@injectable()
export class CertificateManagerAdapter implements ICertificateManagerService {
  async loadCertificate(pfxPath: string, password: string): Promise<Result<Buffer, string>> {
    try {
      const config = {
        ...getDefaultCertificateConfig(),
        pfxPath,
        password,
      };
      const { pfx } = await loadCertificate(config);
      return Result.ok(pfx);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao carregar certificado: ${message}`);
    }
  }

  async signXml(xml: string, pfxPath: string, password: string): Promise<Result<string, string>> {
    try {
      const config = {
        ...getDefaultCertificateConfig(),
        pfxPath,
        password,
      };
      const signedXml = await signXml(xml, config);
      return Result.ok(signedXml);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao assinar XML: ${message}`);
    }
  }

  async validateCertificate(
    pfxPath: string,
    password: string
  ): Promise<Result<CertificateManagerInfo, string>> {
    try {
      const config = {
        ...getDefaultCertificateConfig(),
        pfxPath,
        password,
      };
      const result = await validateCertificate(config);

      if (!result.valid) {
        return Result.fail(result.message ?? 'Certificado invalido');
      }

      const info: CertificateManagerInfo = {
        organization: config.organization,
        issuer: result.issuer ?? 'Desconhecido',
        validFrom: new Date(),
        validTo: result.expiresAt ?? new Date(),
        isValid: result.valid,
      };

      return Result.ok(info);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao validar certificado: ${message}`);
    }
  }
}
