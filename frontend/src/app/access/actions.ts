'use server';

import argon2 from 'argon2';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { createSession, requestIdentity } from '@/lib/auth';

export type LoginState = { error?: string } | undefined;

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');
  const nextValue = String(formData.get('next') || '/');
  const nextPath = nextValue.startsWith('/') && !nextValue.startsWith('//') ? nextValue : '/';
  const identity = await requestIdentity();
  const throttleKey = `login:${identity.ip}`;
  const now = new Date();

  const throttle = await prisma.loginThrottle.findUnique({ where: { key: throttleKey } });
  if (throttle?.blockedUntil && throttle.blockedUntil > now) {
    return { error: '尝试次数过多，请 15 分钟后再试。' };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const valid = user ? await argon2.verify(user.passwordHash, password) : false;
  if (!user || !valid) {
    const resetWindow = !throttle || now.getTime() - throttle.windowStart.getTime() > 15 * 60 * 1000;
    const failureCount = resetWindow ? 1 : throttle.failureCount + 1;
    await prisma.loginThrottle.upsert({
      where: { key: throttleKey },
      create: {
        key: throttleKey,
        failureCount,
        windowStart: now,
        blockedUntil: failureCount >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null,
      },
      update: {
        failureCount,
        windowStart: resetWindow ? now : throttle.windowStart,
        blockedUntil: failureCount >= 5 ? new Date(now.getTime() + 15 * 60 * 1000) : null,
      },
    });
    await prisma.auditLog.create({
      data: { action: 'LOGIN_FAILED', entity: 'User', ip: identity.ip, detail: { username } },
    });
    return { error: '用户名或密码不正确。' };
  }

  await prisma.$transaction([
    prisma.loginThrottle.deleteMany({ where: { key: throttleKey } }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now } }),
    prisma.auditLog.create({
      data: { action: 'LOGIN_SUCCEEDED', entity: 'User', entityId: user.id, ip: identity.ip },
    }),
  ]);
  await createSession(user);
  redirect(user.mustChangePassword ? '/settings?security=first-login' : nextPath);
}
