import 'server-only';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signSessionToken,
  verifySessionToken,
} from '@/lib/session-token';

export async function requestIdentity() {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for');
  return {
    ip: forwarded?.split(',')[0]?.trim() || requestHeaders.get('x-real-ip') || 'unknown',
    userAgent: requestHeaders.get('user-agent')?.slice(0, 500) || 'unknown',
  };
}

export async function createSession(user: {
  id: string;
  sessionVersion: number;
  mustChangePassword: boolean;
}) {
  const identity = await requestIdentity();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt, ip: identity.ip, userAgent: identity.userAgent },
  });
  const token = await signSessionToken({
    userId: user.id,
    sessionId: session.id,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });
  if (
    !session ||
    session.userId !== payload.userId ||
    session.expiresAt <= new Date() ||
    session.user.sessionVersion !== payload.sessionVersion
  ) return null;

  if (Date.now() - session.lastSeenAt.getTime() > 15 * 60 * 1000) {
    void prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  return { ...session.user, sessionId: session.id };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/access');
  return user;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
