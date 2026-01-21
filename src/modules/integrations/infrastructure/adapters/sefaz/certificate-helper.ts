/**
 * Certificate Helper
 *
 * Gerencia certificados digitais A1 para assinatura de XMLs SEFAZ.
 * Migrado de src/services/fiscal/certificate-manager.ts
 *
 * @module integrations/infrastructure/adapters/sefaz
 * @see E10 Fase 3: Migração SEFAZ
 */

import fs from 'fs';
import path from 'path';

export interface CertificateConfig {
  pfxPath: string;
  password: string;
  organization: string;
}

export interface CertificateData {
  pfx: Buffer;
  password: string;
}

/**
 * Carrega certificado A1 do filesystem
 */
export async function loadCertificate(config: CertificateConfig): Promise<CertificateData> {
  try {
    const pfxPath = path.resolve(config.pfxPath);

    if (!fs.existsSync(pfxPath)) {
      throw new Error(`Certificado não encontrado: ${pfxPath}`);
    }

    const pfxBuffer = fs.readFileSync(pfxPath);

    return {
      pfx: pfxBuffer,
      password: config.password,
    };
  } catch (error: unknown) {
    console.error('❌ Erro ao carregar certificado:', error);
    throw new Error(`Falha ao carregar certificado: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Assina XML com certificado A1
 *
 * @param xml - XML a ser assinado
 * @param certificateConfig - Configuração do certificado
 * @returns XML assinado
 *
 * NOTA: Em produção, usar bibliotecas como:
 * - xml-crypto
 * - node-forge
 * - SignedXml
 */
export async function signXml(xml: string, certificateConfig: CertificateConfig): Promise<string> {
  try {
    // Carregar certificado para validar existência
    await loadCertificate(certificateConfig);

    // TODO: E10 Fase 3: Implementar assinatura digital real
    // Em produção, usar xml-crypto ou biblioteca equivalente
    // para assinar o XML com o certificado A1

    console.log('⚠️ MODO DESENVOLVIMENTO: Assinatura simulada');
    console.log(`Certificado: ${certificateConfig.organization}`);
    console.log(`XML tamanho: ${xml.length} bytes`);

    // Por enquanto, retornar XML sem assinatura
    // Em produção, adicionar tag <Signature>
    return xml;
  } catch (error: unknown) {
    console.error('❌ Erro ao assinar XML:', error);
    throw new Error(`Falha na assinatura: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Valida se certificado está válido
 */
export async function validateCertificate(certificateConfig: CertificateConfig): Promise<{
  valid: boolean;
  expiresAt?: Date;
  issuer?: string;
  subject?: string;
  message?: string;
}> {
  try {
    await loadCertificate(certificateConfig);

    // TODO: E10 Fase 3: Em produção, extrair informações do certificado
    // usando node-forge ou similar

    return {
      valid: true,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // +1 ano (simulado)
      issuer: 'AC Certisign RFB G5',
      subject: certificateConfig.organization,
      message: 'Certificado válido (modo desenvolvimento)',
    };
  } catch (error: unknown) {
    return {
      valid: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Configuração padrão do certificado (variáveis de ambiente)
 */
export function getDefaultCertificateConfig(): CertificateConfig {
  return {
    pfxPath: process.env.CERTIFICATE_PFX_PATH || '/path/to/certificate.pfx',
    password: process.env.CERTIFICATE_PASSWORD || '',
    organization: process.env.ORGANIZATION_NAME || 'AuraCore',
  };
}
