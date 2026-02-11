/**
 * CteParserAdapter - Infrastructure Adapter for CTe XML parsing
 *
 * Implements ICteParserService by delegating to the legacy cte-parser.ts.
 * Wraps the legacy async function in a Result-returning interface.
 *
 * @see ICteParserService
 * @see ARCH-011: Implements interface from domain/ports/output/
 * @see INFRA-002: Zero business logic in Infrastructure
 * @since E10 - Legacy service wrapping
 */

import { injectable } from '@/shared/infrastructure/di/container';
import { Result } from '@/shared/domain';
import type {
  ICteParserService,
  ParsedCTeData,
} from '../../domain/ports/output/ICteParserService';

// Import legacy parser
import { parseCTeXML } from '@/services/fiscal/cte-parser';

@injectable()
export class CteParserAdapter implements ICteParserService {
  /**
   * Parses CTe XML by delegating to the legacy parser.
   *
   * Converts the legacy throw-based error handling to Result pattern.
   */
  async parseCTeXml(xmlContent: string): Promise<Result<ParsedCTeData, string>> {
    try {
      const parsed = await parseCTeXML(xmlContent);

      return Result.ok({
        accessKey: parsed.accessKey,
        cteNumber: parsed.cteNumber,
        series: parsed.series,
        model: parsed.model,
        issueDate: parsed.issueDate,
        issuer: {
          cnpj: parsed.issuer.cnpj,
          name: parsed.issuer.name,
          tradeName: parsed.issuer.tradeName,
          ie: parsed.issuer.ie,
        },
        sender: {
          cnpj: parsed.sender.cnpj,
          name: parsed.sender.name,
        },
        recipient: {
          cnpj: parsed.recipient.cnpj,
          name: parsed.recipient.name,
        },
        shipper: parsed.shipper
          ? { cnpj: parsed.shipper.cnpj, name: parsed.shipper.name }
          : undefined,
        receiver: parsed.receiver
          ? { cnpj: parsed.receiver.cnpj, name: parsed.receiver.name }
          : undefined,
        origin: {
          city: parsed.origin.city,
          uf: parsed.origin.uf,
        },
        destination: {
          city: parsed.destination.city,
          uf: parsed.destination.uf,
        },
        values: {
          total: parsed.values.total,
          cargo: parsed.values.cargo,
          icms: parsed.values.icms,
        },
        cargo: {
          weight: parsed.cargo.weight,
          volume: parsed.cargo.volume,
        },
        linkedNfeKeys: parsed.linkedNfeKeys,
        xmlContent: parsed.xmlContent,
        xmlHash: parsed.xmlHash,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail(`Erro ao parsear CTe XML: ${message}`);
    }
  }
}
