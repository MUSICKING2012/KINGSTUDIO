import { permanentRedirect } from 'next/navigation';

// 시퀀스 5d-1 (결정 ① = A 리네임): 대여 카탈로그는 /studios 로 이사했다(nav STUDIOS 라벨과
// URL 일치). 기존 유입(북마크·외부 링크)을 위해 308 로 보존 — /experience→/product 와 동일
// 패턴(route-level permanentRedirect, next.config redirect 를 두지 않는 기존 원칙).
// localePrefix 'always' 라 타깃에 로케일 프리픽스 필수. 비-ko 는 리다이렉트 후 /studios 가
// 데이터 게이트로 404 — 리네임 전(/rental 직접 404)과 최종 동작 동일.
export default function RentalRedirect({
  params: { locale },
}: {
  params: { locale: string };
}) {
  permanentRedirect(`/${locale}/studios`);
}
