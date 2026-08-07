import { permanentRedirect } from 'next/navigation';

// 시퀀스 5c (결정 ① = A 리네임): 체험 카탈로그는 /product 로 이사했다. 기존 유입(북마크·
// 외부 링크·검색 색인)을 위해 308 로 보존. Route-level permanentRedirect (CLAUDE.md keeps no
// next.config redirects); localePrefix 'always' 라 타깃에 로케일 프리픽스 필수.
// SSG 프리렌더 시 permanentRedirect 가 Location 없는 308 정적 산출물로 구워져 프로덕션에서
// 브라우저가 따라갈 수 없는 리다이렉트가 된다(2026-08-07 배포 실측 — dev 는 동적 렌더라 정상).
// 요청 시점 리다이렉트로 강제해 Location 헤더를 보존한다.
export const dynamic = 'force-dynamic';

export default function ExperienceRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  permanentRedirect(`/${locale}/product`);
}
