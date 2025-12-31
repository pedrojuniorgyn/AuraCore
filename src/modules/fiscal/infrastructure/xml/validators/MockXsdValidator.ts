import { ValidationResult, XmlValidationError, XmlValidationWarning } from './IbsCbsXmlValidator';

/**
 * MockXsdValidator: Mock do validador XSD para desenvolvimento/testes
 * 
 * E7.4.1 Semana 9 - XML Builders + Validação
 * 
 * Responsabilidades:
 * - Simular validação XSD sem dependência externa
 * - Validar estrutura básica XML
 * - Validar campos obrigatórios conforme schema type
 * - Em produção: substituir por validador real (libxmljs, xmllint, etc.)
 * 
 * IMPORTANTE: Este é um MOCK para desenvolvimento. Em produção, usar validador XSD real.
 */

export type SchemaType = 'CTE_4.00' | 'NFE_4.00' | 'MDFE_3.00' | 'NFSE_ABRASF_2.04';

interface SchemaDefinition {
  rootElement: string;
  namespace: string;
  requiredFields: string[];
}

export class MockXsdValidator {
  private static readonly SCHEMAS: Record<SchemaType, SchemaDefinition> = {
    'CTE_4.00': {
      rootElement: 'CTe',
      namespace: 'http://www.portalfiscal.inf.br/cte',
      requiredFields: ['infCte', 'ide', 'emit', 'rem', 'dest', 'vPrest', 'imp'],
    },
    'NFE_4.00': {
      rootElement: 'NFe',
      namespace: 'http://www.portalfiscal.inf.br/nfe',
      requiredFields: ['infNFe', 'ide', 'emit', 'dest', 'det', 'total', 'transp', 'cobr'],
    },
    'MDFE_3.00': {
      rootElement: 'MDFe',
      namespace: 'http://www.portalfiscal.inf.br/mdfe',
      requiredFields: ['infMDFe', 'ide', 'emit', 'infModal', 'infDoc'],
    },
    'NFSE_ABRASF_2.04': {
      rootElement: 'CompNfse',
      namespace: 'http://www.abrasf.org.br/nfse.xsd',
      requiredFields: ['InfNfse', 'Numero', 'Prestador', 'Tomador', 'Servico', 'Valores'],
    },
  };

  /**
   * Valida XML contra schema type mockado
   * 
   * @param xml XML string a validar
   * @param schemaType Tipo do schema (CTE, NFE, MDFE, NFSE)
   * @returns ValidationResult
   * 
   * @example
   * ```typescript
   * const result = MockXsdValidator.validate(xmlString, 'CTE_4.00');
   * if (!result.valid) {
   *   console.error('Erros:', result.errors);
   * }
   * ```
   */
  static validate(xml: string, schemaType: SchemaType): ValidationResult {
    const errors: XmlValidationError[] = [];
    const warnings: XmlValidationWarning[] = [];

    try {
      // 1. Validar XML bem formado
      if (!this.isWellFormed(xml)) {
        errors.push({
          field: 'xml',
          message: 'XML mal formado (syntax error)',
          code: 'MALFORMED_XML',
        });
        return { valid: false, errors, warnings };
      }

      // 2. Obter definição do schema
      const schema = this.SCHEMAS[schemaType];
      if (!schema) {
        errors.push({
          field: 'schema',
          message: `Schema type ${schemaType} não suportado`,
          code: 'UNSUPPORTED_SCHEMA',
        });
        return { valid: false, errors, warnings };
      }

      // 3. Validar elemento raiz
      if (!xml.includes(`<${schema.rootElement}`)) {
        errors.push({
          field: 'rootElement',
          message: `Elemento raiz deve ser <${schema.rootElement}>`,
          code: 'INVALID_ROOT',
        });
      }

      // 4. Validar namespace
      if (!xml.includes(schema.namespace)) {
        warnings.push({
          field: 'namespace',
          message: `Namespace esperado: ${schema.namespace}`,
          suggestion: 'Adicionar xmlns correto ao elemento raiz',
        });
      }

      // 5. Validar campos obrigatórios
      for (const field of schema.requiredFields) {
        if (!xml.includes(`<${field}`)) {
          errors.push({
            field,
            message: `Campo obrigatório ${field} não encontrado`,
            code: 'MISSING_REQUIRED_FIELD',
          });
        }
      }

      // 6. Validações específicas por tipo
      this.validateSpecificRules(xml, schemaType, errors, warnings);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push({
        field: 'xml',
        message: `Erro ao validar: ${error instanceof Error ? error.message : String(error)}`,
        code: 'VALIDATION_ERROR',
      });
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Validação assíncrona (mesma lógica, mas async para compatibilidade)
   */
  static async validateAsync(xml: string, schemaType: SchemaType): Promise<ValidationResult> {
    return this.validate(xml, schemaType);
  }

  /**
   * Verifica se XML está bem formado (básico)
   */
  private static isWellFormed(xml: string): boolean {
    // Verificações básicas
    if (!xml || xml.trim() === '') {
      return false;
    }

    // Verificar balanceamento de tags (simplificado)
    const openTags = xml.match(/<[^/][^>]*>/g) || [];
    const closeTags = xml.match(/<\/[^>]*>/g) || [];

    // Não é uma validação completa, mas detecta erros óbvios
    return openTags.length > 0 && closeTags.length > 0;
  }

  /**
   * Validações específicas por tipo de documento
   */
  private static validateSpecificRules(
    xml: string,
    schemaType: SchemaType,
    errors: XmlValidationError[],
    warnings: XmlValidationWarning[]
  ): void {
    switch (schemaType) {
      case 'CTE_4.00':
        // Validar versão CT-e
        if (!xml.includes('versao="4.00"')) {
          warnings.push({
            field: 'versao',
            message: 'Versão CT-e deve ser 4.00',
            suggestion: 'Adicionar versao="4.00" ao elemento raiz',
          });
        }
        break;

      case 'NFE_4.00':
        // Validar versão NF-e
        if (!xml.includes('versao="4.00"')) {
          warnings.push({
            field: 'versao',
            message: 'Versão NF-e deve ser 4.00',
            suggestion: 'Adicionar versao="4.00" ao elemento raiz',
          });
        }
        break;

      case 'MDFE_3.00':
        // Validar versão MDF-e
        if (!xml.includes('versao="3.00"')) {
          warnings.push({
            field: 'versao',
            message: 'Versão MDF-e deve ser 3.00',
            suggestion: 'Adicionar versao="3.00" ao elemento raiz',
          });
        }
        break;

      case 'NFSE_ABRASF_2.04':
        // Validar versão NFS-e ABRASF
        if (!xml.includes('versao="2.04"')) {
          warnings.push({
            field: 'versao',
            message: 'Versão NFS-e ABRASF deve ser 2.04',
            suggestion: 'Adicionar versao="2.04" ao elemento raiz',
          });
        }
        break;
    }
  }
}

