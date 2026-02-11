/**
 * ICteParserService - Port for CTe XML parsing
 *
 * Abstraction for parsing CTe (Conhecimento de Transporte Eletrônico) XML documents.
 * Extracts structured data from CTe XML including identification, parties,
 * values, cargo info, and linked NFe keys.
 *
 * @module fiscal/domain/ports/output
 * @see ARCH-011: Repositories/Gateways implement interface from domain/ports/output/
 * @see E7 DDD Migration of cte-parser.ts
 */

import type { Result } from '@/shared/domain';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Party (participant) in a CTe document
 */
export interface CteParty {
  /** CNPJ or CPF */
  cnpj: string;
  /** Legal name */
  name: string;
}

/**
 * Issuer (emitente) of the CTe
 */
export interface CteIssuer extends CteParty {
  /** Trade name (nome fantasia) */
  tradeName?: string;
  /** State registration (inscrição estadual) */
  ie?: string;
}

/**
 * Location (city + UF)
 */
export interface CteLocation {
  /** City name */
  city: string;
  /** State code (UF - 2 chars) */
  uf: string;
}

/**
 * Financial values of the CTe
 */
export interface CteValues {
  /** Total service value */
  total: number;
  /** Cargo value */
  cargo: number;
  /** ICMS value (if applicable) */
  icms?: number;
}

/**
 * Cargo information
 */
export interface CteCargo {
  /** Weight in kg */
  weight?: number;
  /** Volume */
  volume?: number;
}

/**
 * Structured data extracted from a CTe XML
 */
export interface ParsedCTeData {
  /** Access key (44 digits) */
  accessKey: string;
  /** CTe number */
  cteNumber: string;
  /** Series */
  series: string;
  /** Fiscal model (57 for CTe) */
  model: string;
  /** Issue date */
  issueDate: Date;

  /** Issuer (transportadora) */
  issuer: CteIssuer;
  /** Sender (remetente) */
  sender: CteParty;
  /** Recipient (destinatário) */
  recipient: CteParty;
  /** Shipper (expedidor) - optional */
  shipper?: CteParty;
  /** Receiver (recebedor) - optional */
  receiver?: CteParty;

  /** Origin location */
  origin: CteLocation;
  /** Destination location */
  destination: CteLocation;

  /** Financial values */
  values: CteValues;
  /** Cargo information */
  cargo: CteCargo;

  /** Access keys of linked NFe documents */
  linkedNfeKeys: string[];

  /** Original XML content */
  xmlContent: string;
  /** SHA-256 hash of the XML */
  xmlHash: string;
}

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * Port: CTe XML Parser Service
 *
 * Parses CTe XML documents (Conhecimento de Transporte Eletrônico - Model 57)
 * and extracts structured data for fiscal processing.
 *
 * RULES:
 * - Must handle both procCTe (with protocol) and bare CTe XML formats
 * - Access key must be exactly 44 digits
 * - Generates SHA-256 hash for duplicate detection
 */
export interface ICteParserService {
  /**
   * Parses a CTe XML string into structured data
   *
   * Supports XML with or without procCTe wrapper (protocol envelope).
   *
   * @param xmlContent - Raw CTe XML string
   * @returns Parsed CTe data or error description
   */
  parseCTeXml(xmlContent: string): Promise<Result<ParsedCTeData, string>>;
}
