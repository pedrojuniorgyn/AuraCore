/**
 * NfeParserAdapter - Infrastructure Adapter for NFe XML parsing
 *
 * Implements INfeParserService by delegating to the NfeXmlParser domain service.
 * This adapter bridges the legacy interface (throw-based) with the DDD interface
 * (Result-based) for backward compatibility during migration.
 *
 * NOTE: Prefers the domain service NfeXmlParser over the legacy nfe-parser.ts
 * since the domain service is already fully migrated with Result pattern.
 * The legacy nfe-parser.ts is kept only for direct consumers that haven't
 * been migrated yet.
 *
 * @see INfeParserService
 * @see NfeXmlParser (domain service - the actual implementation)
 * @see ARCH-011: Implements interface from domain/ports/output/
 * @since E10 - Legacy service wrapping
 */

import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  INfeParserService,
} from '../../domain/ports/output/INfeParserService';
import type { ParsedNFe } from '../../domain/services/NfeXmlParser';

// Delegate to the DDD domain service (already migrated)
import { NfeXmlParser } from '../../domain/services/NfeXmlParser';

@injectable()
export class NfeParserAdapter implements INfeParserService {
  /**
   * Parses NFe XML using the NfeXmlParser domain service.
   *
   * Delegates directly to the domain service which already returns Result.
   */
  async parseNFeXml(xmlContent: string): Promise<Result<ParsedNFe, string>> {
    return NfeXmlParser.parse(xmlContent);
  }

  /**
   * Validates NFe XML structure using the NfeXmlParser domain service.
   */
  isValidNFeXml(xmlContent: string): boolean {
    return NfeXmlParser.isValidNFeXML(xmlContent);
  }

  /**
   * Extracts access key using the NfeXmlParser domain service.
   */
  extractAccessKey(xmlContent: string): string | null {
    return NfeXmlParser.extractAccessKey(xmlContent);
  }
}
