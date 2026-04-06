import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'crypto'

function getB2Client(): S3Client {
  const endpoint = process.env.B2_ENDPOINT
  const keyId = process.env.B2_KEY_ID
  const appKey = process.env.B2_APP_KEY
  const region = process.env.B2_REGION || 'us-east-005'

  if (!endpoint || !keyId || !appKey) {
    throw new Error('Backblaze B2 not configured. Set B2_ENDPOINT, B2_KEY_ID, B2_APP_KEY.')
  }

  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: keyId,
      secretAccessKey: appKey,
    },
    forcePathStyle: true, // Required for B2 S3-compatible API
  })
}

export interface UploadResult {
  url: string
  key: string
}

/**
 * Upload a file buffer to Backblaze B2.
 * Returns the public URL and storage key (for later deletion).
 */
export async function uploadToB2(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder = 'photos'
): Promise<UploadResult> {
  const bucket = process.env.B2_BUCKET_NAME
  const publicUrl = process.env.B2_PUBLIC_URL

  if (!bucket || !publicUrl) {
    throw new Error('B2_BUCKET_NAME and B2_PUBLIC_URL must be set')
  }

  const ext = originalName.split('.').pop() || 'jpg'
  const key = `${folder}/${crypto.randomUUID()}.${ext}`

  const client = getB2Client()
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    // Public read — B2 bucket must have public download enabled
  }))

  return {
    url: `${publicUrl}/${key}`,
    key,
  }
}

/**
 * Delete a file from Backblaze B2 by its storage key.
 */
export async function deleteFromB2(key: string): Promise<void> {
  const bucket = process.env.B2_BUCKET_NAME
  if (!bucket) throw new Error('B2_BUCKET_NAME must be set')

  const client = getB2Client()
  await client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }))
}
