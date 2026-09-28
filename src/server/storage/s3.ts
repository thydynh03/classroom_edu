import "server-only";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** StorageProvider: mọi truy cập object storage đi qua đây (dev: SeaweedFS, prod: R2). */
let client: S3Client | null = null;
function s3() {
  client ??= new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    // SDK v3 mặc định gắn checksum CRC32 vào presigned URL → trình duyệt PUT bị 400 (SeaweedFS, R2).
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
  return client;
}
const bucket = () => process.env.S3_BUCKET ?? "classroom-edu-dev";

let bucketChecked = false;
async function ensureBucket() {
  if (bucketChecked || process.env.NODE_ENV === "production") return;
  try {
    await s3().send(new HeadBucketCommand({ Bucket: bucket() }));
  } catch {
    await s3().send(new CreateBucketCommand({ Bucket: bucket() }));
  }
  bucketChecked = true;
}

export async function presignUpload(key: string, contentType: string, size: number) {
  await ensureBucket();
  return getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: 300 },
  );
}

export async function headObject(key: string) {
  try {
    const r = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: r.ContentLength ?? 0, contentType: r.ContentType ?? "" };
  } catch {
    return null;
  }
}

export async function readHead(key: string, bytes = 16) {
  const r = await s3().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key, Range: `bytes=0-${bytes - 1}` }),
  );
  const arr = await r.Body?.transformToByteArray();
  return arr ?? new Uint8Array();
}

export async function presignDownload(key: string, filename: string, inline: boolean) {
  const safe = encodeURIComponent(filename);
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentDisposition: `${inline ? "inline" : "attachment"}; filename*=UTF-8''${safe}`,
    }),
    { expiresIn: 300 },
  );
}

/** Đọc toàn bộ object dạng stream (dùng cho quét virus). */
export async function streamObject(key: string): Promise<AsyncIterable<Uint8Array>> {
  const r = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const body = r.Body as unknown as AsyncIterable<Uint8Array> | undefined;
  if (!body) throw new Error("Không đọc được object");
  return body;
}
