/**
 * Integration Errors
 * E7.9 Integrações - Semana 1
 * 
 * Códigos de erro padronizados para todas as integrações externas
 */

export type IntegrationErrorCode =
  // SEFAZ
  | 'SEFAZ_CONNECTION_ERROR'
  | 'SEFAZ_CERTIFICATE_ERROR'
  | 'SEFAZ_TIMEOUT'
  | 'SEFAZ_REJECTION'
  | 'SEFAZ_INVALID_XML'
  | 'SEFAZ_UNAVAILABLE'
  
  // Banking
  | 'BANKING_AUTH_ERROR'
  | 'BANKING_INSUFFICIENT_BALANCE'
  | 'BANKING_INVALID_ACCOUNT'
  | 'BANKING_PAYMENT_FAILED'
  | 'BANKING_SLIP_NOT_FOUND'
  
  // Email
  | 'EMAIL_SEND_FAILED'
  | 'EMAIL_INVALID_RECIPIENT'
  | 'EMAIL_ATTACHMENT_TOO_LARGE'
  
  // OFX
  | 'OFX_PARSE_ERROR'
  | 'OFX_INVALID_FORMAT'
  | 'OFX_UNSUPPORTED_BANK';

export const IntegrationErrorMessages: Record<IntegrationErrorCode, string> = {
  SEFAZ_CONNECTION_ERROR: 'Failed to connect to SEFAZ',
  SEFAZ_CERTIFICATE_ERROR: 'Certificate error when communicating with SEFAZ',
  SEFAZ_TIMEOUT: 'SEFAZ request timed out',
  SEFAZ_REJECTION: 'Document rejected by SEFAZ',
  SEFAZ_INVALID_XML: 'Invalid XML format for SEFAZ',
  SEFAZ_UNAVAILABLE: 'SEFAZ service is unavailable',
  
  BANKING_AUTH_ERROR: 'Banking authentication failed',
  BANKING_INSUFFICIENT_BALANCE: 'Insufficient balance for operation',
  BANKING_INVALID_ACCOUNT: 'Invalid bank account',
  BANKING_PAYMENT_FAILED: 'Payment execution failed',
  BANKING_SLIP_NOT_FOUND: 'Bank slip not found',
  
  EMAIL_SEND_FAILED: 'Failed to send email',
  EMAIL_INVALID_RECIPIENT: 'Invalid email recipient',
  EMAIL_ATTACHMENT_TOO_LARGE: 'Email attachment too large',
  
  OFX_PARSE_ERROR: 'Failed to parse OFX file',
  OFX_INVALID_FORMAT: 'Invalid OFX format',
  OFX_UNSUPPORTED_BANK: 'Unsupported bank format',
};

