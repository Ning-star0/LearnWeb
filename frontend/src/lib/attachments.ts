import { createHash, randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import sharp, { type Metadata } from 'sharp';
import { prisma } from '@/lib/prisma';

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

const formats = {
  jpeg: { mimeType: 'image/jpeg', extension: 'jpg' },
  png: { mimeType: 'image/png', extension: 'png' },
  webp: { mimeType: 'image/webp', extension: 'webp' },
} as const;

export type PreparedImage = {
  buffer: Buffer;
  mimeType: string;
  extension: string;
  width: number | null;
  height: number | null;
  sha256: string;
};

export async function prepareImage(input: Buffer): Promise<PreparedImage> {
  if (!input.length || input.length > 15 * 1024 * 1024) throw new Error('图片不能为空且不能超过 15MB。');
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { failOn: 'error', limitInputPixels: 80_000_000 }).metadata();
  } catch {
    throw new Error('图片内容损坏或不是真实的 JPG、PNG、WEBP 图片。');
  }
  const format = metadata.format && formats[metadata.format as keyof typeof formats];
  if (!format) throw new Error('图片仅支持 JPG、PNG、WEBP。');

  let buffer: Buffer;
  try {
    buffer = await sharp(input, { failOn: 'error', limitInputPixels: 80_000_000 }).rotate().toBuffer();
  } catch {
    throw new Error('图片无法完成解码和方向校正。');
  }
  const outputMetadata = await sharp(buffer, { failOn: 'error', limitInputPixels: 80_000_000 }).metadata();
  return {
    buffer,
    mimeType: format.mimeType,
    extension: format.extension,
    width: outputMetadata.width ?? null,
    height: outputMetadata.height ?? null,
    sha256: createHash('sha256').update(buffer).digest('hex'),
  };
}

export async function persistPreparedImage(client: DatabaseClient, questionId: string, originalName: string, image: PreparedImage) {
  const uploadRoot = process.env.UPLOAD_ROOT;
  if (!uploadRoot) throw new Error('UPLOAD_ROOT 尚未配置。');
  const now = new Date();
  const directory = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const storageName = `${directory}/${randomBytes(20).toString('hex')}.${image.extension}`;
  const targetDirectory = path.join(/* turbopackIgnore: true */ uploadRoot, directory);
  await mkdir(targetDirectory, { recursive: true });
  const targetPath = path.join(targetDirectory, path.basename(storageName));
  await writeFile(targetPath, image.buffer, { flag: 'wx' });
  try {
    return await client.attachment.create({
      data: {
        questionId, originalName: path.basename(originalName).slice(0, 255), storageName,
        mimeType: image.mimeType, size: image.buffer.length, sha256: image.sha256,
        width: image.width, height: image.height,
      },
    });
  } catch (error) {
    await unlink(targetPath).catch(() => undefined);
    throw error;
  }
}

export async function removeStoredAttachment(storageName: string) {
  const uploadRoot = process.env.UPLOAD_ROOT;
  if (!uploadRoot || !/^\d{4}\/\d{2}\/[a-f0-9]{40}\.(?:jpg|png|webp)$/.test(storageName)) return;
  await unlink(path.join(/* turbopackIgnore: true */ uploadRoot, storageName)).catch(() => undefined);
}

export async function saveImageAttachment(client: DatabaseClient, questionId: string, originalName: string, input: Buffer) {
  return persistPreparedImage(client, questionId, originalName, await prepareImage(input));
}
