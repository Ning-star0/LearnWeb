import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session-token';

const publicPaths = ['/access', '/login', '/api/site-icon', '/api/health'];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const token = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (isPublic) {
    if (token && (pathname === '/access' || pathname === '/login')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const url = new URL('/access', request.url);
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (token.mustChangePassword && !pathname.startsWith('/settings')) {
    return NextResponse.redirect(new URL('/settings?security=first-login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
