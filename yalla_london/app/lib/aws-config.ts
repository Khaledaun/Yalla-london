
import { S3Client } from '@aws-sdk/client-s3'

/**
 * Get S3 bucket config. Optionally pass siteId for per-site folder isolation.
 */
export function getBucketConfig(siteId?: string) {
  const prefix = siteId
    ? process.env[`AWS_FOLDER_PREFIX_${siteId.toUpperCase().replace(/-/g, "_")}`]
      || `${siteId}/`
    : process.env.AWS_FOLDER_PREFIX || 'uploads/';

  return {
    bucketName: process.env.AWS_BUCKET_NAME || 'default-bucket',
    folderPrefix: prefix,
  }
}

export function createS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  } as ConstructorParameters<typeof S3Client>[0])
}
