/**
 * StoragePath - Value Object para caminho de armazenamento
 * 
 * Representa um caminho válido no storage externo (S3/MinIO)
 * Formato: s3://bucket/path ou https://...
 */
import { ValueObject, Result } from '@/shared/domain';

interface StoragePathProps extends Record<string, unknown> {
  value: string;
  provider: 'S3' | 'LOCAL';
  bucket: string;
  key: string;
}

export class StoragePath extends ValueObject<StoragePathProps> {
  private constructor(props: StoragePathProps) {
    super(props);
  }

  get value(): string { return this.props.value; }
  get provider(): 'S3' | 'LOCAL' { return this.props.provider; }
  get bucket(): string { return this.props.bucket; }
  get key(): string { return this.props.key; }

  /**
   * Cria StoragePath a partir de URL completa
   * Aceita s3://bucket/key ou https://endpoint/bucket/key
   */
  static create(path: string): Result<StoragePath, string> {
    const trimmed = path.trim();
    if (!trimmed) {
      return Result.fail('StoragePath não pode ser vazio');
    }

    // Parse s3:// format
    if (trimmed.startsWith('s3://')) {
      const parts = trimmed.replace('s3://', '').split('/');
      const bucket = parts[0] || '';
      const key = parts.slice(1).join('/');

      if (!bucket) {
        return Result.fail('StoragePath s3:// deve ter bucket definido');
      }
      if (!key) {
        return Result.fail('StoragePath s3:// deve ter key definido');
      }

      return Result.ok(new StoragePath({
        value: trimmed,
        provider: 'S3',
        bucket,
        key,
      }));
    }

    // Parse https:// format (MinIO public URL)
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      try {
        const url = new URL(trimmed);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const bucket = pathParts[0] || '';
        const key = pathParts.slice(1).join('/');

        if (!bucket || !key) {
          return Result.fail('StoragePath URL inválida: bucket ou key não encontrado');
        }

        return Result.ok(new StoragePath({
          value: trimmed,
          provider: 'S3',
          bucket,
          key,
        }));
      } catch {
        return Result.fail('StoragePath URL inválida');
      }
    }

    return Result.fail('StoragePath deve começar com s3:// ou http(s)://');
  }

  /**
   * Cria StoragePath a partir de componentes
   */
  static fromComponents(bucket: string, key: string): Result<StoragePath, string> {
    const trimmedBucket = bucket.trim();
    const trimmedKey = key.trim();

    if (!trimmedBucket) {
      return Result.fail('Bucket não pode ser vazio');
    }
    if (!trimmedKey) {
      return Result.fail('Key não pode ser vazio');
    }

    const value = `s3://${trimmedBucket}/${trimmedKey}`;
    return Result.ok(new StoragePath({
      value,
      provider: 'S3',
      bucket: trimmedBucket,
      key: trimmedKey,
    }));
  }

  toString(): string {
    return this.props.value;
  }
}
