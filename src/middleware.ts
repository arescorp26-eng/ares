import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './lib/auth';

const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/login', '/register', '/'];

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => path.startsWith(route));
  const isPublicRoute = publicRoutes.includes(path);

  const session = await getSession(req.cookies);

  // Redirect to login if accessing a protected route without a session
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  // Redirect to dashboard if logged in and accessing a public route like login
  if (isPublicRoute && session && !path.startsWith('/dashboard') && path !== '/') {
    const role = session.user.role;
    if (role === 'ADMIN') return NextResponse.redirect(new URL('/dashboard/admin', req.nextUrl));
    if (role === 'PROFESSOR') return NextResponse.redirect(new URL('/dashboard/professor', req.nextUrl));
    return NextResponse.redirect(new URL('/dashboard/student', req.nextUrl));
  }

  // Role-based authorization
  if (path.startsWith('/dashboard/admin') && session?.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard/student', req.nextUrl));
  }

  if (path.startsWith('/dashboard/professor') && session?.user.role !== 'PROFESSOR' && session?.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard/student', req.nextUrl));
  }

  return NextResponse.next();
}

// Routes Middleware should not run on
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
