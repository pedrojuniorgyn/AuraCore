export { 
  type DocumentType, 
  type DocumentStatus, 
  type DocumentModel,
  DOCUMENT_TYPE_DESCRIPTIONS,
  DOCUMENT_MODEL_BY_TYPE,
  isValidDocumentType,
  isValidDocumentStatus,
  ALLOWED_STATUS_TRANSITIONS,
  canTransitionTo,
} from './DocumentType';

export { CFOP } from './CFOP';
export type { CFOPProps } from './CFOP';

export { FiscalKey } from './FiscalKey';
export type { FiscalKeyProps, FiscalKeyParts } from './FiscalKey';

