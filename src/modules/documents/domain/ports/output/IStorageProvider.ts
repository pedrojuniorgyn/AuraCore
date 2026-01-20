/**
 * IStorageProvider - Port de Output para Storage
 * 
 * Interface para provedores de armazenamento externo (S3, MinIO, etc.)
 */
import { Result } from '@/shared/domain';
import type { Readable } from 'stream';

export interface UploadParams {
  /** Chave/caminho do arquivo no storage */
  key: string;
  /** Conteúdo do arquivo */
  body: Buffer | Readable;
  /** Tipo MIME do conteúdo */
  contentType: string;
  /** Metadados extras (opcional) */
  metadata?: Record<string, string>;
}

export interface DownloadResult {
  /** Stream do conteúdo */
  body: Readable;
  /** Tipo MIME do conteúdo */
  contentType: string;
  /** Tamanho em bytes */
  contentLength: number;
}

export interface StorageInfo {
  /** Nome do bucket */
  bucket: string;
  /** Chave do arquivo */
  key: string;
  /** URL pública ou s3:// */
  url: string;
}

export interface IStorageProvider {
  /**
   * Verifica se o storage está configurado
   */
  isConfigured(): boolean;

  /**
   * Faz upload de um arquivo
   * @returns URL do arquivo no storage
   */
  upload(params: UploadParams): Promise<Result<StorageInfo, string>>;

  /**
   * Baixa um arquivo do storage
   */
  download(key: string): Promise<Result<DownloadResult, string>>;

  /**
   * Baixa arquivo como Buffer
   */
  downloadAsBuffer(key: string): Promise<Result<Buffer, string>>;

  /**
   * Deleta um arquivo do storage
   */
  delete(key: string): Promise<Result<void, string>>;

  /**
   * Verifica se um arquivo existe
   */
  exists(key: string): Promise<Result<boolean, string>>;

  /**
   * Gera URL assinada para download temporário
   * @param expiresIn Tempo de expiração em segundos (default: 3600)
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<Result<string, string>>;
}
