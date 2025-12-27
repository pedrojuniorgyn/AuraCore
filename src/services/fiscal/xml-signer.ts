import { SignedXml } from "xml-crypto";
import { DOMParser } from "xmldom";
import * as forge from "node-forge";

/**
 * Serviço para assinatura digital de XMLs (NFe, CTe, etc)
 * Utiliza certificado A1 (PFX)
 */
export class XmlSigner {
  private pfxBuffer: Buffer;
  private password: string;

  constructor(pfxBuffer: Buffer, password: string) {
    this.pfxBuffer = pfxBuffer;
    this.password = password;
  }

  /**
   * Assinar XML de CTe
   * @param xmlString XML sem assinatura
   * @returns XML assinado
   */
  public signCteXml(xmlString: string): string {
    try {
      // 1. Parse XML
      const doc = new DOMParser().parseFromString(xmlString, "text/xml");

      // 2. Extrair certificado do PFX
      const p12Asn1 = forge.asn1.fromDer(this.pfxBuffer.toString("binary"));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.password);

      // 3. Obter chave privada e certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

      if (!certBags || !keyBags) {
        throw new Error("Certificado ou chave privada não encontrados no PFX");
      }

      const certBag = certBags[forge.pki.oids.certBag]?.[0];
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

      if (!certBag?.cert || !keyBag?.key) {
        throw new Error("Certificado ou chave inválidos");
      }

      const cert = certBag.cert;
      const privateKey = keyBag.key;

      // 4. Converter chave privada para PEM
      const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

      // 5. Assinar XML
      const sig = new SignedXml();
      sig.addReference({
        xpath: "//*[local-name(.)='infCte']",
        transforms: [
          "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
          "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
        ],
        digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
      });

      sig.signingKey = privateKeyPem;
      sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
      sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";

      // 6. Adicionar informações do certificado
      sig.keyInfoProvider = {
        getKeyInfo: () => {
          const certPem = forge.pki.certificateToPem(cert);
          const certBase64 = certPem
            .replace(/-----BEGIN CERTIFICATE-----/, "")
            .replace(/-----END CERTIFICATE-----/, "")
            .replace(/\n/g, "");

          return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`;
        },
      };

      // 7. Computar assinatura
      sig.computeSignature(xmlString, {
        location: { reference: "//*[local-name(.)='infCte']", action: "after" },
      });

      // 8. Retornar XML assinado
      const signedXml = sig.getSignedXml();
      return signedXml;
    } catch (error: any) {
      console.error("❌ Erro ao assinar XML:", error);
      throw new Error(`Falha na assinatura digital: ${error.message}`);
    }
  }

  /**
   * Verificar se o certificado é válido
   */
  public verifyCertificate(): { valid: boolean; expiresAt?: Date; cn?: string } {
    try {
      const p12Asn1 = forge.asn1.fromDer(this.pfxBuffer.toString("binary"));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.password);

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags?.[forge.pki.oids.certBag]?.[0];

      if (!certBag?.cert) {
        return { valid: false };
      }

      const cert = certBag.cert;
      const now = new Date();
      const notBefore = cert.validity.notBefore;
      const notAfter = cert.validity.notAfter;

      const isValid = now >= notBefore && now <= notAfter;

      // Extrair CN (Common Name)
      const cn = cert.subject.getField("CN")?.value || "Desconhecido";

      return {
        valid: isValid,
        expiresAt: notAfter,
        cn,
      };
    } catch (error: any) {
      console.error("❌ Erro ao verificar certificado:", error);
      return { valid: false };
    }
  }
}

/**
 * Factory para criar XmlSigner a partir do banco de dados
 */
export async function createXmlSignerFromDb(organizationId: number): Promise<XmlSigner> {
  const { db } = await import("@/lib/db");
  const { digitalCertificates } = await import("@/lib/db/schema");
  const { eq, and, isNull } = await import("drizzle-orm");

  const [cert] = await db
    .select()
    .from(digitalCertificates)
    .where(
      and(
        eq(digitalCertificates.organizationId, organizationId),
        isNull(digitalCertificates.deletedAt)
      )
    );

  if (!cert?.pfxContent || !cert.password) {
    throw new Error("Certificado digital não configurado");
  }

  const pfxBuffer = Buffer.from(cert.pfxContent, "base64");
  return new XmlSigner(pfxBuffer, cert.password);
}























