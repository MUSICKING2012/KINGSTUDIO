import { routing } from '@/lib/i18n/routing';
import createMiddleware from 'next-intl/middleware';

// Locale detection (browser/IP via Accept-Language) + redirect to a prefixed path. PRD §5.1.
export default createMiddleware(routing);

export const config = {
  // Run on all paths except API, the non-localized /admin area, Next internals, and files with an extension.
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)'],
};
