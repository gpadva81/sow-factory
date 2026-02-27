export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    // Protect all routes except: auth, login, setup, static assets
    '/((?!api/auth|api/setup|login|setup|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
