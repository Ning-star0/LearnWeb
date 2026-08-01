'use server';

import argon2 from 'argon2';
import { redirect } from 'next/navigation';
import { clearSession, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function logoutAction() {
  const user = await requireUser();
  await prisma.session.deleteMany({ where: { id: user.sessionId } });
  await clearSession();
  redirect('/access');
}

export async function logoutAllAction() {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { sessionVersion: { increment: 1 } },
  });
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await clearSession();
  redirect('/access');
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const currentPassword = String(formData.get('currentPassword') || '');
  const newPassword = String(formData.get('newPassword') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');

  if (!(await argon2.verify(user.passwordHash, currentPassword))) {
    redirect('/settings?security=invalid-current');
  }
  if (newPassword.length < 12 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    redirect('/settings?security=weak-password');
  }
  if (newPassword !== confirmPassword) redirect('/settings?security=password-mismatch');

  const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false, sessionVersion: { increment: 1 } },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.auditLog.create({
      data: { action: 'PASSWORD_CHANGED', entity: 'User', entityId: user.id },
    }),
  ]);
  await clearSession();
  redirect('/access?changed=1');
}
