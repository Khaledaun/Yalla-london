
import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand 
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createS3Client, getBucketConfig } from './aws-config'

const s3Client = createS3Client()
const { bucketName, folderPrefix } = getBucketConfig()

export async function uploadFile(buffer: Buffer, fileName: string): Promise<string> {
  const key = `${folderPrefix}uploads/${Date.now()}-${fileName}`
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: getContentType(fileName),
  })
  
  try {
    await s3Client.send(command)
    return key // Return the S3 key (cloud_storage_path)
  } catch (error) {
    console.error('Error uploading file:', error)
    throw new Error('Failed to upload file to S3')
  }
}

export async function downloadFile(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  })
  
  try {
    // Generate signed URL valid for 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    return signedUrl
  } catch (error) {
    console.error('Error generating download URL:', error)
    throw new Error('Failed to generate download URL')
  }
}

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  })
  
  try {
    await s3Client.send(command)
  } catch (error) {
    console.error('Error deleting file:', error)
    throw new Error('Failed to delete file from S3')
  }
}

export async function renameFile(oldKey: string, newKey: string): Promise<string> {
  // S3 doesn't have rename, so we copy then delete
  const fullNewKey = `${folderPrefix}uploads/${Date.now()}-${newKey}`
  
  // This is a simplified version - in production you'd use CopyObjectCommand
  // For now, we'll just return the new key pattern
  return fullNewKey
}

function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop()
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    avif: 'image/avif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return contentTypes[ext || ''] || 'application/octet-stream'
}

export function getPublicUrl(key: string): string {
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
}
