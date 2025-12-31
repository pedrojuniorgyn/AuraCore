/**
 * XML Validators - Public Exports
 * 
 * E7.4.1 Semana 9-10 - XML Builders + Validação
 */

// Validators
export * from './IbsCbsXmlValidator';
export * from './MockXsdValidator';
export * from './XmlSchemaValidator';
export * from './RtcMockValidator';

// Re-export types
export type {
  ValidationResult,
  XmlValidationError,
  XmlValidationWarning,
} from './IbsCbsXmlValidator';

export type {
  SchemaType,
} from './MockXsdValidator';

export type {
  IXmlSchemaValidator,
} from './XmlSchemaValidator';

export type {
  RtcValidationResult,
  RtcValidationError,
  RtcValidationWarning,
  FiscalDocument as RtcFiscalDocument,
  IRtcValidator,
} from './RtcMockValidator';

