import { ValidationResult } from './IbsCbsXmlValidator';
import { MockXsdValidator, SchemaType } from './MockXsdValidator';

import { logger } from '@/shared/infrastructure/logging';
/**
 * XmlSchemaValidator: Interface unificada para validação XSD
 * 
 * E7.4.1 Semana 9 - XML Builders + Validação
 * 
 * Responsabilidades:
 * - Interface unificada para validação XSD
 * - Delegar para implementação real ou mock
 * - Em produção: conectar com validador XSD real
 * 
 * Strategy Pattern: permite trocar implementação (Mock ↔ Real) sem impactar código cliente
 */

export interface IXmlSchemaValidator {
  validate(xml: string, schemaType: SchemaType): ValidationResult;
  validateAsync(xml: string, schemaType: SchemaType): Promise<ValidationResult>;
}

/**
 * Implementação padrão usando MockXsdValidator
 * 
 * Em produção: substituir por RealXsdValidator (libxmljs, xmllint, etc.)
 */
export class XmlSchemaValidator implements IXmlSchemaValidator {
  private static instance: XmlSchemaValidator;

  private constructor() {
    // Singleton
  }

  /**
   * Obter instância singleton
   */
  static getInstance(): XmlSchemaValidator {
    if (!XmlSchemaValidator.instance) {
      XmlSchemaValidator.instance = new XmlSchemaValidator();
    }
    return XmlSchemaValidator.instance;
  }

  /**
   * Valida XML contra schema
   * 
   * @param xml XML string
   * @param schemaType Tipo do schema
   * @returns ValidationResult
   * 
   * @example
   * ```typescript
   * const validator = XmlSchemaValidator.getInstance();
   * const result = validator.validate(xmlString, 'CTE_4.00');
   * ```
   */
  validate(xml: string, schemaType: SchemaType): ValidationResult {
    // Em desenvolvimento: usar Mock
    // Em produção: trocar para validador real
    return MockXsdValidator.validate(xml, schemaType);
    
    // Exemplo de como seria com validador real:
    // return RealXsdValidator.validate(xml, schemaType);
  }

  /**
   * Valida XML contra schema (assíncrono)
   */
  async validateAsync(xml: string, schemaType: SchemaType): Promise<ValidationResult> {
    // Em desenvolvimento: usar Mock
    // Em produção: trocar para validador real assíncrono
    return MockXsdValidator.validateAsync(xml, schemaType);
  }

  /**
   * Convenience method para validar CT-e
   */
  validateCTe(xml: string): ValidationResult {
    return this.validate(xml, 'CTE_4.00');
  }

  /**
   * Convenience method para validar NF-e
   */
  validateNFe(xml: string): ValidationResult {
    return this.validate(xml, 'NFE_4.00');
  }

  /**
   * Convenience method para validar MDF-e
   */
  validateMDFe(xml: string): ValidationResult {
    return this.validate(xml, 'MDFE_3.00');
  }

  /**
   * Convenience method para validar NFS-e
   */
  validateNFSe(xml: string): ValidationResult {
    return this.validate(xml, 'NFSE_ABRASF_2.04');
  }
}

/**
 * Factory para obter validador correto baseado em configuração
 */
export class XmlValidatorFactory {
  /**
   * Cria validador baseado em ambiente
   * 
   * @returns IXmlSchemaValidator (Mock em dev, Real em production)
   */
  static create(): IXmlSchemaValidator {
    const env = process.env.NODE_ENV || 'development';
    
    if (env === 'production') {
      // Em produção: retornar validador real
      // return new RealXsdValidator();
      
      // Por enquanto, usar Mock mesmo em produção
      logger.warn('[XmlValidatorFactory] Using MockXsdValidator in production');
      return XmlSchemaValidator.getInstance();
    }
    
    // Desenvolvimento: usar Mock
    return XmlSchemaValidator.getInstance();
  }
}

