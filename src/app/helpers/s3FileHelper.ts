import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import path from 'path';
import crypto from 'crypto';

import { s3Client, S3_BUCKET } from '../config/s3.config';

const generateFileName = (originalName: string) => {
  const extension = path.extname(originalName);

  const baseName = path
    .basename(originalName, extension)
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '');

  const uniqueId = crypto.randomUUID();

  return `${baseName}-${Date.now()}-${uniqueId}${extension}`;
};

export const generateS3Key = (folderName: string, originalName: string): string => {
  const sanitizedFolder = folderName
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');

  return `${sanitizedFolder}/${generateFileName(originalName)}`;
};

export const uploadFileToS3 = async (
  file: Express.Multer.File,
  folderName: string,
): Promise<string> => {
  if (!file) {
    throw new Error('File is required');
  }

  const key = generateS3Key(folderName, file.originalname);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ContentDisposition: 'inline',
  });

  await s3Client.send(command);

  return key;
};

// Uploads multiple files (either a flat array, or a Multer `.fields()` map
// of fieldName -> File[]) to the same S3 folder in parallel.
export const uploadFilesToS3 = async (
  files: Express.Multer.File[],
  folderName: string,
): Promise<string[]> => {
  if (!files?.length) return [];
  return Promise.all(files.map((file) => uploadFileToS3(file, folderName)));
};

export const deleteFileFromS3 = async (
  key: string,
): Promise<void> => {
  try {
    if (!key) return;

    const normalizedKey = key.replace(/^\/+/, '');

    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: normalizedKey,
    });

    await s3Client.send(command);

    console.log(`Deleted from S3: ${normalizedKey}`);
  } catch (error) {
    console.error(`Failed to delete S3 file: ${key}`, error);
    throw error;
  }
};

// Batch delete (S3 supports up to 1000 keys per DeleteObjects call).
export const deleteFilesFromS3 = async (keys: string[]): Promise<void> => {
  const validKeys = (keys || []).filter(Boolean).map((k) => k.replace(/^\/+/, ''));
  if (!validKeys.length) return;

  try {
    const command = new DeleteObjectsCommand({
      Bucket: S3_BUCKET,
      Delete: {
        Objects: validKeys.map((Key) => ({ Key })),
        Quiet: true,
      },
    });

    await s3Client.send(command);
    console.log(`Deleted ${validKeys.length} file(s) from S3`);
  } catch (error) {
    console.error(`Failed to batch delete S3 files:`, error);
    throw error;
  }
};

// Legacy records (from before this S3 migration) store local paths like
// "/uploads/profile/x.jpg" — those are still served by express.static('public')
// and must never be treated as S3 keys (no leading slash, no protocol).
export const isLegacyLocalPath = (value: string): boolean =>
  value.startsWith('/uploads/') || value.startsWith('http://') || value.startsWith('https://');

// Turns a stored S3 object key into a temporary signed GET URL. Legacy local
// paths and already-absolute URLs are returned unchanged. Never persist the
// result — only generate it when serving a response to the frontend.
export const resolveFileUrl = async (
  value?: string | null,
): Promise<string | null> => {
  if (!value) return value ?? null;
  if (isLegacyLocalPath(value)) return value;

  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: value.replace(/^\/+/, ''),
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  } catch (error) {
    console.error(`Failed to generate presigned URL for key: ${value}`, error);
    return null;
  }
};

export const resolveFileUrls = async (
  values?: (string | null | undefined)[] | null,
): Promise<string[]> => {
  if (!values?.length) return [];
  const resolved = await Promise.all(values.map((v) => resolveFileUrl(v)));
  return resolved.filter((v): v is string => Boolean(v));
};
