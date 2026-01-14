import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Artifact } from "@/types/artifact";
import { getArtifactType } from "@/types/artifact";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const endpoint = process.env.S3_ENDPOINT;
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;

    if (!endpoint || !accessKey || !secretKey) {
      throw new Error("S3 environment variables are not configured");
    }

    s3Client = new S3Client({
      endpoint,
      region: "us-east-1", // SeaweedFS doesn't care, but SDK requires it
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Required for SeaweedFS
    });
  }
  return s3Client;
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET environment variable is not set");
  }
  return bucket;
}

export async function listProjectArtifacts(
  projectId: string
): Promise<Artifact[]> {
  const client = getS3Client();
  const bucket = getBucket();
  const prefix = `projects/${projectId}/`;

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  });

  const response = await client.send(command);
  const contents = response.Contents || [];

  const artifacts: Artifact[] = await Promise.all(
    contents
      .filter((obj) => obj.Key && obj.Size && obj.Size > 0)
      .map(async (obj) => {
        const key = obj.Key!;
        const name = key.split("/").pop() || key;

        // Generate presigned URL for download
        const getCommand = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        });
        const url = await getSignedUrl(client, getCommand, { expiresIn: 3600 });

        return {
          key,
          name,
          size: obj.Size || 0,
          lastModified: obj.LastModified?.toISOString() || "",
          url,
          type: getArtifactType(key),
        };
      })
  );

  return artifacts;
}

export async function getArtifactContent(key: string): Promise<string> {
  const client = getS3Client();
  const bucket = getBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await client.send(command);
  const body = response.Body;

  if (!body) {
    throw new Error("Empty response body");
  }

  // Convert stream to string
  const chunks: Uint8Array[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return buffer.toString("utf-8");
}

export async function uploadArtifact(
  projectId: string,
  filename: string,
  content: string,
  contentType: string = "text/markdown"
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucket();
  const key = `projects/${projectId}/artifacts/${filename}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
    ContentType: contentType,
  });

  await client.send(command);
  return key;
}

export async function getPresignedUrl(key: string): Promise<string> {
  const client = getS3Client();
  const bucket = getBucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export function getPublicUrl(key: string): string {
  const publicEndpoint = process.env.S3_PUBLIC_ENDPOINT;
  const bucket = getBucket();

  if (!publicEndpoint) {
    return "";
  }

  return `${publicEndpoint}/${bucket}/${key}`;
}
