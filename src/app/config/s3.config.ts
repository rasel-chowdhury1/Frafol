import { S3Client } from '@aws-sdk/client-s3';

console.log('AWS CONFIG CHECK:', {
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET,
  accessKeyPrefix: process.env.AWS_ACCESS_KEY_ID?.slice(0, 4),
  accessKeyLength: process.env.AWS_ACCESS_KEY_ID?.length,
  secretLoaded: !!process.env.AWS_SECRET_ACCESS_KEY,
});
console.log(process.env.AWS_ACCESS_KEY_ID)



export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const S3_BUCKET = process.env.AWS_S3_BUCKET!;