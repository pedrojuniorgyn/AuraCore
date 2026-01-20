/**
 * S3StorageProvider - Implementação do IStorageProvider para S3/MinIO
 * 
 * Utiliza o client S3 existente em src/lib/storage/s3.ts
 */
import { injectable } from 'tsyringe';
import type { Readable } from 'stream';
import { Result } from '@/shared/domain';
import type {
  IStorageProvider,
  UploadParams,
  DownloadResult,
  StorageInfo,
} from '../../domain/ports/output/IStorageProvider';
import {
  isS3Configured,
  uploadBufferToS3,
  downloadObjectToBuffer,
  headObject,
  getSignedDownloadUrl,
} from '@/lib/storage/s3';

@injectable()
export class S3StorageProvider implements IStorageProvider {
  isConfigured(): boolean {
    return isS3Configured();
  }

  async upload(params: UploadParams): Promise<Result<StorageInfo, string>> {
    try {
      if (!this.isConfigured()) {
        return Result.fail('Storage S3 não está configurado');
      }

      // Converter Readable para Buffer se necessário
      let buffer: Buffer;
      if (Buffer.isBuffer(params.body)) {
        buffer = params.body;
      } else {
        buffer = await this.streamToBuffer(params.body);
      }

      const result = await uploadBufferToS3({
        key: params.key,
        contentType: params.contentType,
        body: buffer,
      });

      return Result.ok({
        bucket: result.bucket,
        key: result.key,
        url: result.url,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha no upload: ${message}`);
    }
  }

  async download(key: string): Promise<Result<DownloadResult, string>> {
    try {
      if (!this.isConfigured()) {
        return Result.fail('Storage S3 não está configurado');
      }

      const buffer = await downloadObjectToBuffer({ key });
      
      // Criar stream do buffer
      const { Readable: ReadableStream } = await import('stream');
      const stream = ReadableStream.from(buffer);

      return Result.ok({
        body: stream as Readable,
        contentType: 'application/octet-stream',
        contentLength: buffer.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha no download: ${message}`);
    }
  }

  async downloadAsBuffer(key: string): Promise<Result<Buffer, string>> {
    try {
      if (!this.isConfigured()) {
        return Result.fail('Storage S3 não está configurado');
      }

      const buffer = await downloadObjectToBuffer({ key });
      return Result.ok(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha no download: ${message}`);
    }
  }

  async delete(key: string): Promise<Result<void, string>> {
    try {
      if (!this.isConfigured()) {
        return Result.fail('Storage S3 não está configurado');
      }

      // Importar dinamicamente o cliente para delete
      const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      
      const endpoint = process.env.S3_ENDPOINT;
      const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true';
      const bucket = process.env.S3_BUCKET || '';

      const client = new S3Client({
        region: process.env.S3_REGION || 'us-east-1',
        endpoint: endpoint || undefined,
        forcePathStyle,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
      });

      await client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }));

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha ao deletar: ${message}`);
    }
  }

  async exists(key: string): Promise<Result<boolean, string>> {
    try {
      if (!this.isConfigured()) {
        return Result.fail('Storage S3 não está configurado');
      }

      const exists = await headObject({ key });
      return Result.ok(exists);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha ao verificar existência: ${message}`);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<Result<string, string>> {
    try {
      if (!this.isConfigured()) {
        return Result.fail('Storage S3 não está configurado');
      }

      const url = await getSignedDownloadUrl({
        key,
        expiresSeconds: expiresIn,
      });

      return Result.ok(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return Result.fail(`Falha ao gerar URL assinada: ${message}`);
    }
  }

  /**
   * Converte Readable stream para Buffer
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
