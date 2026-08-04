import { permanentRedirect } from 'next/navigation';

// CategoryIA refactor: the combined /packages listing was split into per-category entry points.
// /packages now 308-redirects to the experience catalog — /product since sequence 5c renamed
// /experience (redirect chain avoided by pointing straight at the final URL). Route-level
// permanentRedirect (CLAUDE.md keeps no next.config redirects); localePrefix is 'always', so the
// target must carry the locale prefix.
export default function PackagesRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  permanentRedirect(`/${locale}/product`);
}
