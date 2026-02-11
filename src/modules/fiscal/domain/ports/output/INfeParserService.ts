/**
 * INfeParserService - Port for NFe XML parsing
 *
 * Abstraction for parsing NFe (Nota Fiscal Eletrônica) XML documents.
 * This port provides backward compatibility with the legacy nfe-parser.ts
 * while the NfeXmlParser domain service handles the actual parsing logic.
 *
 * NOTE: The NfeXmlParser domain service already provides identical functionality
 * using the Result pattern. This port exists to allow legacy consumers
 * (sefaz-processor.ts, fiscal-classification-service.ts) to be migrated
 * incrementally to the DDD architecture via DI.
 *
 * @module fiscal/domain/ports/output
 * @see NfeXmlParser (domain service - preferred for new code)
 * @see ARCH-011: Repositories/Gateways implement interface from domain/ports/output/
 * @see E7 DDD Migration of nfe-parser.ts
 */

import type { Result } from '@/shared/domain';

// Re-export ParsedNFe from the domain service to avoid type duplication
import type { ParsedNFe } from '../../services/NfeXmlParser';
export type { ParsedNFe };

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * Port: NFe XML Parser Service
 *
 * Parses NFe XML documents (Nota Fiscal Eletrônica - Model 55/65)
 * and extracts structured data for fiscal processing.
 *
 * RULES:
 * - Must handle both nfeProc (with protocol) and bare NFe XML formats
 * - Access key must be exactly 44 digits
 * - Generates SHA-256 hash for duplicate detection
 * - Items must be normalized to array even when single item
 */
export interface INfeParserService {
  /**
   * Parses a NFe XML string into structured data
   *
   * Supports XML with or without nfeProc wrapper (protocol envelope).
   *
   * @param xmlContent - Raw NFe XML string
   * @returns Parsed NFe data or error description
   */
  parseNFeXml(xmlContent: string): Promise<Result<ParsedNFe, string>>;

  /**
   * Validates whether an XML string is a valid NFe document
   *
   * Quick validation that checks for the presence of <infNFe> tag.
   * Does NOT perform full parse or access key validation.
   *
   * @param xmlContent - Raw XML string to validate
   * @returns true if XML has valid NFe structure
   */
  isValidNFeXml(xmlContent: string): boolean;

  /**
   * Extracts only the access key from NFe XML (fast path)
   *
   * Faster than full parse when only the access key is needed.
   *
   * @param xmlContent - Raw NFe XML string
   * @returns 44-digit access key or null if extraction fails
   */
  extractAccessKey(xmlContent: string): string | null;
}
