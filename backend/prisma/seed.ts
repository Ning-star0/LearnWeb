import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: join(process.cwd(), '.env') });

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 开始种子数据...\n');

  // 清理旧数据（按依赖顺序反向删除）
  await prisma.adminLog.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.supporterAccess.deleteMany();
  await prisma.questionAiExplanation.deleteMany();
  await prisma.reviewQuestion.deleteMany();
  await prisma.wrongQuestion.deleteMany();
  await prisma.answerRecord.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionBank.deleteMany();
  await prisma.book.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // 1. 创建课程
  const course = await prisma.course.create({
    data: { name: '政治 / 思政' },
  });
  console.log(`✅ 课程: ${course.name}`);

  // 2. 创建教材
  const bookNames = [
    '马克思主义基本原理',
    '毛泽东思想和中国特色社会主义理论体系概论',
    '中国近现代史纲要',
    '思想道德与法治',
    '习近平新时代中国特色社会主义思想概论',
  ];

  const books: Record<string, number> = {};
  let sortOrder = 0;
  for (const name of bookNames) {
    const book = await prisma.book.create({
      data: { courseId: course.id, name, sortOrder: sortOrder++ },
    });
    books[name] = book.id;
    console.log(`✅ 教材: ${book.name}`);
  }

  // 3. 创建超级管理员
  const superAdminPassword = await hash('Admin123456', 10);
  const superAdmin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: '超级管理员',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ 超级管理员: ${superAdmin.email} / Admin123456`);

  // 4. 创建普通用户
  const userPassword = await hash('User123456', 10);
  const normalUser = await prisma.user.create({
    data: {
      email: 'user@example.com',
      username: '测试用户',
      password: userPassword,
      status: 'ACTIVE',
    },
  });
  console.log(`✅ 普通用户: ${normalUser.email} / User123456`);

  // 5. 创建支持者用户并开通权限
  const supporterPassword = await hash('Supporter123456', 10);
  const supporter = await prisma.user.create({
    data: {
      email: 'supporter@example.com',
      username: '支持者用户',
      password: supporterPassword,
      status: 'ACTIVE',
    },
  });

  await prisma.supporterAccess.create({
    data: {
      userId: supporter.id,
      type: 'LIFETIME_AI_EXPLANATION',
      source: 'MANUAL',
      note: '种子数据自动开通',
    },
  });
  console.log(`✅ 支持者用户: ${supporter.email} / Supporter123456`);

  // 6. 写入默认系统设置
  const settings = [
    { key: 'enableAiExplanation', value: 'true' },
    { key: 'allowUserUpload', value: 'false' },
    { key: 'aiProvider', value: 'deepseek' },
    { key: 'aiModel', value: 'deepseek-chat' },
    { key: 'aiAutoApprove', value: 'true' },
    { key: 'maxUploadSizeMB', value: '10' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.create({ data: s });
  }
  console.log(`✅ 系统设置: ${settings.length} 项`);

  console.log('\n🎉 种子数据完成！');
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log('管理员: admin@example.com / Admin123456');
  console.log('普通用户: user@example.com / User123456');
  console.log('支持者: supporter@example.com / Supporter123456');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
