import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type S3Env = {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
  publicBaseUrl?: string;
};

function readS3Env(): S3Env | null {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    endpoint: process.env.S3_ENDPOINT || undefined, // ex.: http://minio:9000
    region: process.env.S3_REGION || "us-east-1",
    accessKeyId,
    secretAccessKey,
    bucket,
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "true") === "true",
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL || undefined, // ex.: https://minio.example.com
  };
}

function getClient(): { client: S3Client; env: S3Env } {
  const env = readS3Env();
  if (!env) {
    throw new Error(
      "Storage S3 não configurado. Defina S3_BUCKET, S3_ACCESS_KEY_ID e S3_SECRET_ACCESS_KEY (e opcionalmente S3_ENDPOINT/S3_REGION)."
    );
  }

  const client = new S3Client({
    region: env.region,
    endpoint: env.endpoint,
    forcePathStyle: env.forcePathStyle,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });

  return { client, env };
}

export function isS3Configured(): boolean {
  return !!readS3Env();
}

export type S3UploadResult = {
  bucket: string;
  key: string;
  url: string; // s3://bucket/key ou URL pública (se S3_PUBLIC_BASE_URL estiver setada)
};

export async function uploadBufferToS3(args: {
  key: string;
  contentType: string;
  body: Buffer;
}): Promise<S3UploadResult> {
  const { client, env } = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: env.bucket,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
    })
  );

  const url = env.publicBaseUrl
    ? `${env.publicBaseUrl.replace(/\/$/, "")}/${env.bucket}/${encodeURIComponent(args.key).replace(/%2F/g, "/")}`
    : `s3://${env.bucket}/${args.key}`;

  return { bucket: env.bucket, key: args.key, url };
}

export async function headObject(args: { key: string }): Promise<boolean> {
  const { client, env } = getClient();
  try {
    await client.send(new HeadObjectCommand({ Bucket: env.bucket, Key: args.key }));
    return true;
  } catch {
    return false;
  }
}

export async function getSignedDownloadUrl(args: { key: string; expiresSeconds?: number }): Promise<string> {
  const { client, env } = getClient();
  const expiresIn = args.expiresSeconds ?? 900;
  const cmd = new GetObjectCommand({ Bucket: env.bucket, Key: args.key });
  return await getSignedUrl(client, cmd, { expiresIn });
}

export async function downloadObjectToBuffer(args: { key: string }): Promise<Buffer> {
  const { client, env } = getClient();
  const out = await client.send(new GetObjectCommand({ Bucket: env.bucket, Key: args.key }));

  // SDK v3: Body é stream no Node.js
  const body = out.Body as any;
  if (!body) return Buffer.from([]);

  if (Buffer.isBuffer(body)) return body;

  const chunks: Buffer[] = [];
  try {
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (e) {
    // best-effort: encerra o stream em caso de erro mid-flight
    try {
      if (typeof body?.destroy === "function") body.destroy(e);
    } catch {
      // ignore
    }
    throw e;
  }
}
