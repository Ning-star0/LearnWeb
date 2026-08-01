import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const username = process.argv.find((value, index) => index > 1 && !value.startsWith('--')) || process.env.ADMIN_USERNAME || 'baixing';
const generate = process.argv.includes('--generate');

if (!generate) {
  console.error('用法：npm run admin:reset-password -- <用户名> --generate');
  process.exitCode = 2;
} else {
  const password = `Atlas9-${randomBytes(15).toString('base64url')}`;
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { username },
        data: { passwordHash, mustChangePassword: true, sessionVersion: { increment: 1 } },
        select: { id: true },
      });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.auditLog.create({ data: { action: 'PASSWORD_RESET_BY_SERVER', entity: 'User', entityId: user.id } });
    });
    console.log(`USERNAME=${username}`);
    console.log(`TEMPORARY_PASSWORD=${password}`);
    console.log('All previous sessions were revoked. Password change is required after login.');
  } finally {
    await prisma.$disconnect();
  }
}

