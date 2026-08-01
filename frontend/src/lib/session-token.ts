import { jwtVerify, SignJWT } from 'jose';

export const SESSION_COOKIE = 'mistake_atlas_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionToken = {
  userId: string;
  sessionId: string;
  sessionVersion: number;
  mustChangePassword: boolean;
};

function secretKey() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SECRET 未配置或长度不足 32 位');
  return new TextEncoder().encode(value);
}

export async function signSessionToken(payload: SessionToken) {
  return new SignJWT({
    sid: payload.sessionId,
    sv: payload.sessionVersion,
    mcp: payload.mustChangePassword,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined): Promise<SessionToken | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.sid !== 'string' || typeof payload.sv !== 'number') return null;
    return {
      userId: payload.sub,
      sessionId: payload.sid,
      sessionVersion: payload.sv,
      mustChangePassword: payload.mcp === true,
    };
  } catch {
    return null;
  }
}
