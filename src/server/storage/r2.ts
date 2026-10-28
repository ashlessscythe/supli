import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** Optional override for local MinIO / S3-compatible stand-ins. */
  endpoint?: string;
};

let cachedClient: S3Client | null = null;
let cachedConfigKey: string | null = null;

/**
 * Reads R2 env vars. Returns null when incomplete so the app can run
 * without object storage (upload UI hidden, placeholders only).
 */
export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const endpoint = process.env.R2_ENDPOINT?.trim();

  if (!accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }
  // Cloudflare R2 needs account id for the default endpoint; custom
  // endpoints (MinIO) may omit it.
  if (!endpoint && !accountId) {
    return null;
  }

  return {
    accountId: accountId ?? "",
    accessKeyId,
    secretAccessKey,
    bucket,
    endpoint: endpoint || undefined,
  };
}

export function isR2Configured(): boolean {
  return getR2Config() !== null;
}

function r2Endpoint(config: R2Config): string {
  if (config.endpoint) return config.endpoint;
  return `https://${config.accountId}.r2.cloudflarestorage.com`;
}

export function getR2Client(config?: R2Config): S3Client {
  const resolved = config ?? getR2Config();
  if (!resolved) {
    throw new Error("Object storage is not configured");
  }
  const key = `${r2Endpoint(resolved)}|${resolved.accessKeyId}|${resolved.bucket}`;
  if (cachedClient && cachedConfigKey === key) {
    return cachedClient;
  }
  cachedClient = new S3Client({
    region: "auto",
    endpoint: r2Endpoint(resolved),
    credentials: {
      accessKeyId: resolved.accessKeyId,
      secretAccessKey: resolved.secretAccessKey,
    },
    forcePathStyle: Boolean(resolved.endpoint),
    // Avoid x-amz-checksum-* on browser PUTs — bucket CORS only allows Content-Type.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  cachedConfigKey = key;
  return cachedClient;
}

/** Test helper — clears the singleton client. */
export function resetR2ClientForTests(): void {
  cachedClient = null;
  cachedConfigKey = null;
}

export const PRESIGNED_PUT_EXPIRES_SECONDS = 60 * 5; // 5 minutes
export const PRESIGNED_GET_EXPIRES_SECONDS = 60 * 15; // 15 minutes

/**
 * Presigned browser PUT. Signs **Content-Type only** (plus host) so the
 * client can upload with a single CORS-allowed header. Size is enforced
 * server-side on presign + confirm — Content-Length is not signed, because
 * browsers set it automatically and Tony's R2 CORS allows Content-Type only.
 */
export async function createPresignedPutUrl(input: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const config = getR2Config();
  if (!config) {
    throw new Error("Object storage is not configured");
  }
  const client = getR2Client(config);
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
    ContentType: input.contentType,
  });
  return getSignedUrl(client, command, {
    expiresIn: input.expiresIn ?? PRESIGNED_PUT_EXPIRES_SECONDS,
    // Keep content-type in SignedHeaders so the PUT cannot change MIME type.
    signableHeaders: new Set(["content-type"]),
  });
}

export async function createPresignedGetUrl(input: {
  key: string;
  expiresIn?: number;
}): Promise<string> {
  const config = getR2Config();
  if (!config) {
    throw new Error("Object storage is not configured");
  }
  const client = getR2Client(config);
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: input.key,
  });
  return getSignedUrl(client, command, {
    expiresIn: input.expiresIn ?? PRESIGNED_GET_EXPIRES_SECONDS,
  });
}

/** Best-effort delete — never throws to callers that treat cleanup as optional. */
export async function deleteR2Object(key: string): Promise<boolean> {
  const config = getR2Config();
  if (!config) return false;
  try {
    const client = getR2Client(config);
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}
