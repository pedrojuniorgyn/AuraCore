/**
 * Documents Resource
 * @module @auracore/sdk/resources/documents
 */

import type {
  Document,
  DocumentUploadRequest,
  DocumentUploadResponse,
} from '../types';

type RequestFn = <T>(method: string, path: string, data?: unknown) => Promise<T>;

export class DocumentsResource {
  constructor(private readonly request: RequestFn) {}

  /**
   * Upload a document
   *
   * @example
   * ```typescript
   * const doc = await client.documents.upload({
   *   content: base64Content,
   *   filename: 'danfe.pdf',
   *   mimeType: 'application/pdf',
   *   documentType: 'danfe',
   * });
   * ```
   */
  async upload(request: DocumentUploadRequest): Promise<DocumentUploadResponse> {
    return this.request<DocumentUploadResponse>('POST', '/v1/documents/upload', request);
  }

  /**
   * Upload a file directly (Browser only)
   *
   * @example
   * ```typescript
   * const file = document.getElementById('file-input').files[0];
   * const doc = await client.documents.uploadFile(file, 'danfe');
   * ```
   */
  async uploadFile(
    file: File,
    documentType?: DocumentUploadRequest['documentType']
  ): Promise<DocumentUploadResponse> {
    const content = await this.fileToBase64(file);
    return this.upload({
      content,
      filename: file.name,
      mimeType: file.type,
      documentType,
    });
  }

  /**
   * Process an uploaded document
   */
  async process(id: string): Promise<Document> {
    return this.request<Document>('POST', `/v1/documents/${id}/process`, {});
  }

  /**
   * Get document by ID
   */
  async get(id: string): Promise<Document> {
    return this.request<Document>('GET', `/v1/documents/${id}`);
  }

  /**
   * Delete document
   */
  async delete(id: string): Promise<void> {
    await this.request<void>('DELETE', `/v1/documents/${id}`);
  }

  /**
   * List documents
   */
  async list(options?: { page?: number; limit?: number }): Promise<Document[]> {
    const params = new URLSearchParams();
    if (options?.page) params.set('page', String(options.page));
    if (options?.limit) params.set('limit', String(options.limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Document[]>('GET', `/v1/documents${query}`);
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (): void => {
        const result = reader.result as string;
        resolve(result.split(',')[1] ?? result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
