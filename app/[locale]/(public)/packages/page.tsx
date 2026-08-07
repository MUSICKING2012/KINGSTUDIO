import { permanentRedirect } from 'next/navigation';

// CategoryIA refactor: the combined /packages listing was split into per-category entry points.
// /packages now 308-redirects to the experience catalog — /product since sequence 5c renamed
// /experience (redirect chain avoided by pointing straight at the final URL). Route-level
// permanentRedirect (CLAUDE.md keeps no next.config redirects); localePrefix is 'always', so the
// target must carry the locale prefix.
// SSG 프리렌더 시 permanentRedirect 가 Location 없는 308 정적 산출물로 구워져 프로덕션에서
// 브라우저가 따라갈 수 없는 리다이렉트가 된다(2026-08-07 배포 실측 — dev 는 동적 렌더라 정상).
// 요청 시점 리다이렉트로 강제해 Location 헤더를 보존한다.
export const dynamic = 'force-dynamic';

export default function PackagesRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  permanentRedirect(`/${locale}/product`);
}
