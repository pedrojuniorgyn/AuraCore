/**
 * Docling Infrastructure Module
 * =============================
 *
 * Integração com o serviço Docling para processamento de documentos fiscais.
 *
 * O Docling é uma biblioteca Python da IBM que:
 * - Extrai texto e tabelas de PDFs com 97.9% de precisão
 * - Execução 100% local (dados fiscais sensíveis)
 * - Licença MIT (sem restrições)
 *
 * @example
 * ```typescript
 * import { createDoclingClient, Result } from '@/shared/infrastructure/docling';
 *
 * const client = createDoclingClient();
 *
 * // Verificar saúde do serviço
 * const health = await client.healthCheck();
 * if (Result.isOk(health)) {
 *   console.log('Docling online:', health.value.version);
 * }
 *
 * // Processar DANFe PDF
 * const result = await client.processDocument('danfe_123.pdf');
 * if (Result.isOk(result)) {
 *   console.log('Extraído:', result.value.text);
 * }
 * ```
 *
 * @module shared/infrastructure/docling
 * @see docker/docling/ - Serviço Docker
 * @see E-Agent-Fase-D1
 */

// Client
export { DoclingClient, createDoclingClient } from './DoclingClient';

// Types - Config
export type { DoclingConfig } from './types';

// Types - Extraction
export type {
  DocumentExtractionResult,
  ExtractedTable,
  DocumentMetadata,
  BoundingBox,
  HealthStatus,
} from './types';

// Types - Fiscal (Prepared for D2/D3)
export type {
  DANFeData,
  DANFeProduto,
  DACTeData,
} from './types';

// Types - Error
export type {
  DoclingError,
  DoclingErrorType,
} from './types';

// Types - Raw API (internal use)
export type {
  RawProcessResponse,
  RawExtractTablesResponse,
  RawExtractTextResponse,
  RawHealthResponse,
} from './types';
