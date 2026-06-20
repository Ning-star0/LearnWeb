import { BadRequestException } from '@nestjs/common';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.xlsx'];
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
// XLSX 文件魔数：PK 头（ZIP 格式）
const XLSX_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export function validateExcelFile(file: Express.Multer.File) {
  if (!file) {
    throw new BadRequestException('请上传文件');
  }

  // 校验文件大小
  if (file.size > MAX_FILE_SIZE) {
    throw new BadRequestException('文件大小不能超过 10MB');
  }

  if (file.size === 0) {
    throw new BadRequestException('文件为空');
  }

  // 校验扩展名
  const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new BadRequestException('只允许上传 .xlsx 文件');
  }

  // 校验 MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('文件格式不正确，只支持 .xlsx');
  }

  // 校验文件魔数（防止伪造扩展名）
  if (file.buffer.length < 4) {
    throw new BadRequestException('文件损坏');
  }
  const magic = file.buffer.slice(0, 4);
  if (!magic.equals(XLSX_MAGIC_BYTES)) {
    throw new BadRequestException('文件格式校验失败');
  }
}
