import { permanentRedirect } from 'next/navigation';

// CategoryIA refactor: the combined /packages listing was split into per-category entry points
// (/experience /rental /group). /packages now 308-redirects to the experience catalog. Route-level
// permanentRedirect (CLAUDE.md keeps no next.config redirects); localePrefix is 'always', so the
// target must carry the locale prefix.
export default function PackagesRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  permanentRedirect(`/${locale}/experience`);
}
