import { permanentRedirect } from 'next/navigation';

// 시퀀스 5c (결정 ① = A 리네임): 체험 카탈로그는 /product 로 이사했다. 기존 유입(북마크·
// 외부 링크·검색 색인)을 위해 308 로 보존. Route-level permanentRedirect (CLAUDE.md keeps no
// next.config redirects); localePrefix 'always' 라 타깃에 로케일 프리픽스 필수.
export default function ExperienceRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  permanentRedirect(`/${locale}/product`);
}
