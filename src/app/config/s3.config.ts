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
export const S3_REGION = process.env.AWS_REGION!;

// Public base URL objects are served from (no trailing slash). Overridable
// via env for other environments; defaults to the production bucket's URL.
export const S3_PUBLIC_BASE_URL = (
  process.env.AWS_S3_PUBLIC_BASE_URL ||
  'https://frafol-media-prod-498618930282-us-east-1-an.s3.us-east-1.amazonaws.com'
).replace(/\/+$/, '');