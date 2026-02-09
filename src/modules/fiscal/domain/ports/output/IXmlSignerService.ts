/**
 * IXmlSignerService - Output Port
 *
 * Interface para assinatura digital de XML fiscal.
 * Isola o Use Case do servico legacy de assinatura.
 *
 * @see ARCH-011: Repositories/Services implementam interface de domain/ports/output/
 * @see ARCH-006: Dependencias apontam para Domain (inward)
 */
import { Result } from '@/shared/domain';

export interface CertificateInfo {
  valid: boolean;
  expiresAt?: Date;
  subject?: string;
}

export interface IXmlSignerService {
  /**
   * Verifica validade do certificado digital
   */
  verifyCertificate(organizationId: number): Promise<Result<CertificateInfo, string>>;

  /**
   * Assina XML de CTe com certificado digital
   */
  signCteXml(xml: string, organizationId: number): Promise<Result<string, string>>;
}
