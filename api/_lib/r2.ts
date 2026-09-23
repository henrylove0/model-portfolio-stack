import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

let client: S3Client | null = null

function getClient(): S3Client {
  if (client) return client
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 credentials are not configured')
  }
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  return client
}

export function bucket(): string {
  const b = process.env.R2_BUCKET
  if (!b) throw new Error('R2_BUCKET is not configured')
  return b
}

export async function putObject(
  key: string,
  body: Buffer | string,
  contentType: string,
  cacheControl: string,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  )
}

export async function getObjectText(key: string): Promise<string | null> {
  try {
    const out = await getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: key }))
    return await out.Body!.transformToString()
  } catch (err) {
    if ((err as { name?: string }).name === 'NoSuchKey') return null
    throw err
  }
}

/** Read a raw request body as a buffer, aborting if it exceeds maxBytes. */
export async function readBody(req: NodeJS.ReadableStream, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length
    if (size > maxBytes) throw new Error('payload too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
