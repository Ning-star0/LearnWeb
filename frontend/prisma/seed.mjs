import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const username = process.env.ADMIN_USERNAME || 'baixing';
const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;

if (!initialPassword || initialPassword.length < 12) {
  throw new Error('ADMIN_INITIAL_PASSWORD 必须设置且至少 12 位。');
}

const passwordHash = await argon2.hash(initialPassword, { type: argon2.argon2id });

await prisma.user.upsert({
  where: { username },
  update: {},
  create: { username, displayName: '主人', passwordHash, mustChangePassword: true },
});

await prisma.siteSettings.upsert({ where: { id: 'site' }, update: {}, create: {} });
await prisma.learningSettings.upsert({ where: { id: 'learning' }, update: {}, create: {} });

const subjects = [
  { slug: 'mathematics', name: '数学', shortName: '数学', description: '当前完整启用：教材、章节、知识点、错题与复习闭环', icon: 'Sigma', color: '#2458d3', enabled: true, sortOrder: 1 },
  { slug: 'cs-408', name: '408 计算机专业基础', shortName: '408', description: '已预留通用框架，暂未启用具体内容', icon: 'Cpu', color: '#7c3aed', enabled: false, sortOrder: 2 },
  { slug: 'english', name: '英语', shortName: '英语', description: '已预留通用框架，暂未启用具体内容', icon: 'Languages', color: '#059669', enabled: false, sortOrder: 3 },
  { slug: 'politics', name: '政治', shortName: '政治', description: '已预留通用框架，暂未启用具体内容', icon: 'Landmark', color: '#d97706', enabled: false, sortOrder: 4 },
];

for (const subject of subjects) {
  await prisma.subject.upsert({ where: { slug: subject.slug }, update: subject, create: subject });
}

const math = await prisma.subject.findUniqueOrThrow({ where: { slug: 'mathematics' } });
const textbook = await prisma.textbook.upsert({
  where: { subjectId_name: { subjectId: math.id, name: '未指定教材' } },
  update: {},
  create: { subjectId: math.id, name: '未指定教材', description: '暂时无法归入具体教材的错题' },
});
await prisma.chapter.upsert({
  where: { textbookId_parentId_name: { textbookId: textbook.id, parentId: null, name: '未分类章节' } },
  update: {},
  create: { textbookId: textbook.id, name: '未分类章节' },
});

for (const [index, name] of ['方法没有想到', '概念理解不清', '条件遗漏', '计算失误', '符号错误', '步骤跳跃', '分类讨论不完整', '审题错误'].entries()) {
  await prisma.errorType.upsert({
    where: { subjectId_name: { subjectId: math.id, name } },
    update: {},
    create: { subjectId: math.id, name, color: index < 3 ? 'amber' : 'slate' },
  });
}

console.log(`初始化完成：${username}，数学已启用，其他学科框架已预留。`);
await prisma.$disconnect();
