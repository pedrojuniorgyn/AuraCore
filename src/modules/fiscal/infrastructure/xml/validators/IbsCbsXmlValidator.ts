/**
 * IbsCbsXmlValidator: Validador específico para grupo IBSCBS em XML
 * 
 * E7.4.1 Semana 9 - XML Builders + Validação
 * 
 * Responsabilidades:
 * - Validar campos obrigatórios do grupo IBSCBS
 * - Validar tipos e ranges de valores
 * - Validar consistência (base * alíquota = valor)
 * - Validar CST e classificação tributária
 * 
 * Referência: NT 2025.001/002 - Grupo IBSCBS
 */

export interface XmlValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface XmlValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: XmlValidationError[];
  warnings: XmlValidationWarning[];
}

interface ParsedIbsCbs {
  CST?: string;
  cClassTrib?: string;
  vBC?: string;
  pIBSUF?: string;
  vIBSUF?: string;
  pIBSMun?: string;
  vIBSMun?: string;
  pCBS?: string;
  vCBS?: string;
}

export class IbsCbsXmlValidator {
  /**
   * Valida XML do grupo IBSCBS
   * 
   * @param xmlContent Conteúdo XML do grupo IBSCBS (string ou objeto parsed)
   * @returns ValidationResult com erros e warnings
   */
  static validate(xmlContent: string | ParsedIbsCbs): ValidationResult {
    const errors: XmlValidationError[] = [];
    const warnings: XmlValidationWarning[] = [];

    // Parse XML se necessário
    const parsed = typeof xmlContent === 'string' 
      ? this.parseXml(xmlContent) 
      : xmlContent;

    if (!parsed) {
      return {
        valid: false,
        errors: [{ field: 'xml', message: 'XML inválido ou vazio' }],
        warnings: [],
      };
    }

    // 1. Validar campos obrigatórios
    this.validateRequiredFields(parsed, errors);

    // 2. Validar valores (se campos existem)
    if (errors.length === 0) {
      this.validateValues(parsed, errors, warnings);
    }

    // 3. Validar consistência (se valores são válidos)
    if (errors.length === 0) {
      this.validateConsistency(parsed, errors);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Parse básico de XML string para objeto
   * (Em produção, usar parser XML real como xmldom ou fast-xml-parser)
   */
  private static parseXml(xmlContent: string): ParsedIbsCbs | null {
    try {
      const parsed: ParsedIbsCbs = {};
      
      // Regex simples para extração de tags (MOCK - usar parser real em produção)
      const extractTag = (tag: string): string | undefined => {
        const regex = new RegExp(`<${tag}>([^<]*)<\/${tag}>`);
        const match = xmlContent.match(regex);
        return match ? match[1] : undefined;
      };

      parsed.CST = extractTag('CST');
      parsed.cClassTrib = extractTag('cClassTrib');
      parsed.vBC = extractTag('vBC');
      parsed.pIBSUF = extractTag('pIBSUF');
      parsed.vIBSUF = extractTag('vIBSUF');
      parsed.pIBSMun = extractTag('pIBSMun');
      parsed.vIBSMun = extractTag('vIBSMun');
      parsed.pCBS = extractTag('pCBS');
      parsed.vCBS = extractTag('vCBS');

      return parsed;
    } catch (error) {
      return null;
    }
  }

  /**
   * Valida presença de campos obrigatórios
   */
  private static validateRequiredFields(
    parsed: ParsedIbsCbs,
    errors: XmlValidationError[]
  ): void {
    const required = [
      'CST',
      'cClassTrib',
      'vBC',
      'pIBSUF',
      'vIBSUF',
      'pIBSMun',
      'vIBSMun',
      'pCBS',
      'vCBS',
    ];

    for (const field of required) {
      const value = parsed[field as keyof ParsedIbsCbs];
      if (!value || value.trim() === '') {
        errors.push({
          field,
          message: `Campo ${field} é obrigatório`,
          code: 'REQUIRED_FIELD',
        });
      }
    }
  }

  /**
   * Valida tipos e ranges de valores
   */
  private static validateValues(
    parsed: ParsedIbsCbs,
    errors: XmlValidationError[],
    warnings: XmlValidationWarning[]
  ): void {
    // Validar CST (00-90)
    if (parsed.CST) {
      const cst = parseInt(parsed.CST, 10);
      if (isNaN(cst) || cst < 0 || cst > 90) {
        errors.push({
          field: 'CST',
          message: 'CST deve estar entre 00 e 90',
          code: 'INVALID_CST',
        });
      }
    }

    // Validar cClassTrib (formato: 9 dígitos)
    if (parsed.cClassTrib) {
      if (!/^\d{9}$/.test(parsed.cClassTrib)) {
        errors.push({
          field: 'cClassTrib',
          message: 'cClassTrib deve ter exatamente 9 dígitos',
          code: 'INVALID_CLASS_TRIB',
        });
      }
    }

    // Validar alíquotas (0-100%)
    const rates = [
      { field: 'pIBSUF', value: parsed.pIBSUF },
      { field: 'pIBSMun', value: parsed.pIBSMun },
      { field: 'pCBS', value: parsed.pCBS },
    ];

    for (const rate of rates) {
      if (rate.value) {
        const value = parseFloat(rate.value);
        if (isNaN(value)) {
          errors.push({
            field: rate.field,
            message: `${rate.field} deve ser numérico`,
            code: 'INVALID_NUMBER',
          });
        } else if (value < 0 || value > 100) {
          errors.push({
            field: rate.field,
            message: `${rate.field} deve estar entre 0 e 100`,
            code: 'INVALID_RATE',
          });
        } else if (value > 20) {
          warnings.push({
            field: rate.field,
            message: `${rate.field} maior que 20% é incomum`,
            suggestion: 'Verifique se a alíquota está correta',
          });
        }
      }
    }

    // Validar valores monetários (não negativos)
    const values = [
      { field: 'vBC', value: parsed.vBC },
      { field: 'vIBSUF', value: parsed.vIBSUF },
      { field: 'vIBSMun', value: parsed.vIBSMun },
      { field: 'vCBS', value: parsed.vCBS },
    ];

    for (const val of values) {
      if (val.value) {
        const value = parseFloat(val.value);
        if (isNaN(value)) {
          errors.push({
            field: val.field,
            message: `${val.field} deve ser numérico`,
            code: 'INVALID_NUMBER',
          });
        } else if (value < 0) {
          errors.push({
            field: val.field,
            message: `${val.field} não pode ser negativo`,
            code: 'NEGATIVE_VALUE',
          });
        }
      }
    }
  }

  /**
   * Valida consistência matemática (valor = base * alíquota / 100)
   */
  private static validateConsistency(
    parsed: ParsedIbsCbs,
    errors: XmlValidationError[]
  ): void {
    const vBC = parseFloat(parsed.vBC || '0');

    // Validar vIBSUF = vBC * pIBSUF / 100
    const pIBSUF = parseFloat(parsed.pIBSUF || '0');
    const vIBSUF = parseFloat(parsed.vIBSUF || '0');
    const expectedIBSUF = (vBC * pIBSUF) / 100;

    if (Math.abs(vIBSUF - expectedIBSUF) > 0.01) {
      errors.push({
        field: 'vIBSUF',
        message: `vIBSUF inconsistente: esperado ${expectedIBSUF.toFixed(2)}, encontrado ${vIBSUF.toFixed(2)}`,
        code: 'INCONSISTENT_VALUE',
      });
    }

    // Validar vIBSMun = vBC * pIBSMun / 100
    const pIBSMun = parseFloat(parsed.pIBSMun || '0');
    const vIBSMun = parseFloat(parsed.vIBSMun || '0');
    const expectedIBSMun = (vBC * pIBSMun) / 100;

    if (Math.abs(vIBSMun - expectedIBSMun) > 0.01) {
      errors.push({
        field: 'vIBSMun',
        message: `vIBSMun inconsistente: esperado ${expectedIBSMun.toFixed(2)}, encontrado ${vIBSMun.toFixed(2)}`,
        code: 'INCONSISTENT_VALUE',
      });
    }

    // Validar vCBS = vBC * pCBS / 100
    const pCBS = parseFloat(parsed.pCBS || '0');
    const vCBS = parseFloat(parsed.vCBS || '0');
    const expectedCBS = (vBC * pCBS) / 100;

    if (Math.abs(vCBS - expectedCBS) > 0.01) {
      errors.push({
        field: 'vCBS',
        message: `vCBS inconsistente: esperado ${expectedCBS.toFixed(2)}, encontrado ${vCBS.toFixed(2)}`,
        code: 'INCONSISTENT_VALUE',
      });
    }
  }
}

