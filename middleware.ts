import { routing } from '@/lib/i18n/routing';
import createMiddleware from 'next-intl/middleware';

// Locale detection (browser/IP via Accept-Language) + redirect to a prefixed path. PRD §5.1.
export default createMiddleware(routing);

export const config = {
  // Run on all paths except API, Next internals, and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
