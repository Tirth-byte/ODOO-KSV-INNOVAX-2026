import { NextResponse, type NextRequest } from 'next/server';

/**
 * Firebase Auth state lives client-side, so deep auth checks happen in the
 * RouteGuard component. This middleware handles coarse routing only: it sends
 * the bare root to the dashboard (the client guard then bounces unauthenticated
 * users to /login).
 */
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.svg).*)'],
};
