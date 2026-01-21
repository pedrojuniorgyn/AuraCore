/**
 * RAG Resource
 * @module @auracore/sdk/resources/rag
 */

import type { RAGQueryRequest, RAGQueryResponse, RAGCollection } from '../types';

type RequestFn = <T>(method: string, path: string, data?: unknown) => Promise<T>;

export class RAGResource {
  constructor(private readonly request: RequestFn) {}

  /**
   * Query the RAG system
   *
   * @example
   * ```typescript
   * const result = await client.rag.query('legislação ICMS SP');
   * console.log(result.answer);
   * console.log(result.sources);
   * ```
   */
  async query(request: RAGQueryRequest): Promise<RAGQueryResponse>;
  async query(
    query: string,
    options?: Partial<Omit<RAGQueryRequest, 'query'>>
  ): Promise<RAGQueryResponse>;
  async query(
    queryOrRequest: string | RAGQueryRequest,
    options?: Partial<Omit<RAGQueryRequest, 'query'>>
  ): Promise<RAGQueryResponse> {
    const request: RAGQueryRequest =
      typeof queryOrRequest === 'string'
        ? { query: queryOrRequest, ...options }
        : queryOrRequest;

    return this.request<RAGQueryResponse>('POST', '/v1/rag/query', request);
  }

  /**
   * List available collections
   */
  async listCollections(): Promise<RAGCollection[]> {
    return this.request<RAGCollection[]>('GET', '/v1/rag/collections');
  }

  /**
   * Get collection info
   */
  async getCollection(id: string): Promise<RAGCollection> {
    return this.request<RAGCollection>('GET', `/v1/rag/collections/${id}`);
  }
}
