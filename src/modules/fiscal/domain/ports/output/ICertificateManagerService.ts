/**
 * ICertificateManagerService - Output Port
 *
 * Interface para gerenciamento de certificados digitais A1/A3.
 * Implementada por adapter que encapsula o legacy certificate-manager.
 *
 * @module fiscal/domain/ports/output
 * @see ARCH-011: Repositories/Services implementam interface de domain/ports/output/
 * @see ARCH-006: Dependencias apontam para Domain (inward)
 */

import { Result } from '@/shared/domain';

export interface CertificateManagerInfo {
  organization: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  isValid: boolean;
}

export interface ICertificateManagerService {
  /**
   * Carrega certificado digital A1 (.PFX) do filesystem
   */
  loadCertificate(pfxPath: string, password: string): Promise<Result<Buffer, string>>;

  /**
   * Assina XML fiscal com certificado digital A1
   */
  signXml(xml: string, pfxPath: string, password: string): Promise<Result<string, string>>;

  /**
   * Valida certificado digital e retorna informações
   */
  validateCertificate(pfxPath: string, password: string): Promise<Result<CertificateManagerInfo, string>>;
}
