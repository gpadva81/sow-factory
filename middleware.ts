export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    // Protect all routes except: auth endpoints, login page, static assets
    '/((?!api/auth|login|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
