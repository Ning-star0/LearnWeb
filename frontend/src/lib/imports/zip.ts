import { unzipSync, type UnzipFileInfo } from 'fflate';

const MAX_ARCHIVE_BYTES = 15 * 1024 * 1024;
const MAX_ENTRY_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;
const MAX_ENTRIES = 500;
const MAX_COMPRESSION_RATIO = 100;

export type InspectedImportZip = {
  markdownSources: Array<{ name: string; raw: string }>;
  images: Map<string, Uint8Array>;
  entryCount: number;
  totalUncompressedBytes: number;
};

export function normalizeZipPath(name: string) {
  const normalized = name.replaceAll('\\', '/');
  if (!normalized || normalized.includes('\0') || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) throw new Error(`ZIP 包含不安全路径：${name}`);
  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '..' || segment === '.')) throw new Error(`ZIP 包含路径穿越：${name}`);
  return segments.filter(Boolean).join('/');
}

function validateEntry(info: UnzipFileInfo, counters: { entries: number; total: number }) {
  const name = normalizeZipPath(info.name);
  counters.entries += 1;
  counters.total += info.originalSize;
  if (counters.entries > MAX_ENTRIES) throw new Error(`ZIP 文件数超过 ${MAX_ENTRIES} 个。`);
  if (info.originalSize > MAX_ENTRY_BYTES) throw new Error(`ZIP 内单个文件超过 15MB：${name}`);
  if (counters.total > MAX_TOTAL_BYTES) throw new Error('ZIP 解压后总大小超过 100MB。');
  if (info.originalSize > 0 && (info.size === 0 || info.originalSize / info.size > MAX_COMPRESSION_RATIO)) throw new Error(`ZIP 压缩比异常：${name}`);
  if (info.compression !== 0 && info.compression !== 8) throw new Error(`ZIP 使用了不支持的压缩算法：${name}`);
  return !name.endsWith('/');
}

export function inspectImportZip(input: Uint8Array): InspectedImportZip {
  if (!input.length || input.length > MAX_ARCHIVE_BYTES) throw new Error('ZIP 不能为空且不能超过 15MB。');
  const counters = { entries: 0, total: 0 };
  let extracted: Record<string, Uint8Array>;
  try {
    extracted = unzipSync(input, { filter: (info) => validateEntry(info, counters) });
  } catch (error) {
    throw new Error(error instanceof Error ? `ZIP 安全检查失败：${error.message}` : 'ZIP 无法解压。');
  }

  const markdownSources: Array<{ name: string; raw: string }> = [];
  const images = new Map<string, Uint8Array>();
  for (const [rawName, bytes] of Object.entries(extracted)) {
    const name = normalizeZipPath(rawName);
    const lower = name.toLocaleLowerCase();
    if (lower.startsWith('questions/') && lower.endsWith('.md')) {
      try {
        markdownSources.push({ name, raw: new TextDecoder('utf-8', { fatal: true }).decode(bytes) });
      } catch {
        throw new Error(`Markdown 不是有效 UTF-8：${name}`);
      }
    } else if (lower.startsWith('images/') && /\.(?:jpe?g|png|webp)$/.test(lower)) {
      images.set(name, bytes);
    } else {
      throw new Error(`ZIP 只允许 questions/*.md 和 images/*.(jpg|jpeg|png|webp)：${name}`);
    }
  }
  if (!markdownSources.length) throw new Error('ZIP 的 questions/ 目录中没有 Markdown 文件。');
  return { markdownSources, images, entryCount: counters.entries, totalUncompressedBytes: counters.total };
}

export function resolveZipImagePath(_markdownName: string, referencedName: string) {
  const reference = normalizeZipPath(referencedName);
  if (!reference.startsWith('images/')) throw new Error(`图片引用必须使用 ZIP 根目录下的 images/ 路径：${referencedName}`);
  return reference;
}
