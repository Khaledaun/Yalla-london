
import { S3Client } from '@aws-sdk/client-s3'

export function getBucketConfig() {
  return {
    bucketName: process.env.AWS_BUCKET_NAME || 'default-bucket',
    folderPrefix: process.env.AWS_FOLDER_PREFIX || 'yalla-london/'
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
