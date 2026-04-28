import { NextRequest, NextResponse } from 'next/server';

const customerProtectedPrefixes = [
  '/home',
  '/cart',
  '/checkout',
  '/orders',
  '/bookings',
  '/account',
  '/addresses',
  '/favourites',
  '/rewards',
  '/settings',
  '/tryon',
  '/wallet',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get('eyekra_session')?.value);

  if (pathname.startsWith('/admin') && pathname !== '/admin/login' && !hasSession) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (customerProtectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    if (!hasSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/home/:path*', '/cart/:path*', '/checkout/:path*', '/orders/:path*', '/bookings/:path*', '/account/:path*', '/addresses/:path*', '/favourites/:path*', '/rewards/:path*', '/settings/:path*', '/tryon/:path*', '/wallet/:path*'],
};
