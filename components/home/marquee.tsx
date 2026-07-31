'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 마퀴 래퍼 — **화면 밖에서는 애니메이션을 일시정지**한다.
 *
 * 근거(2026-07-31 Lighthouse 실측, 프로덕션 빌드 /en 데스크톱): `edi-marquee 24s infinite`
 * 가 CPU 유휴 상태를 영원히 막아 트레이스가 14.7초까지 늘어나고, 그 창 위에서 Speed Index
 * 8.7s · LCP 2.5s 로 계산돼 성능 77점(Gate 3 기준 ≥90 미달)이 나왔다. reduced-motion 으로
 * 마퀴만 멈추면 98점 — 감점 전부가 이 애니메이션 하나다.
 *
 * 마퀴는 첫 화면 밖(실측 top 1190 > viewport 940)이므로, 뷰포트에 없을 때 정지해도 시각
 * 변화가 전혀 없다. 지표를 속이는 게 아니라 안 보이는 동안 영원히 도는 실제 낭비(모바일
 * 배터리 포함)를 없애는 것이다.
 *
 * `prefers-reduced-motion` 정지 가드는 `globals.css` 최하단에 별도로 이미 있다 — CSS 가
 * `animation: none` 으로 이기므로 이 컴포넌트의 play-state 인라인 스타일과 충돌하지 않는다.
 *
 * IntersectionObserver 미지원/JS 실패 시엔 초기값 'running' 으로 남아 종전과 동일하게 돈다
 * (기능 상실 없음 — 점진적 향상). 초기값을 'paused' 로 뒤집는 실험도 했으나 점수 변화가
 * 노이즈 범위(±2)였다 — 남은 LCP ~2.1s 는 마퀴가 아니라 2MB 풀 가변 폰트의 시뮬레이션
 * 다운로드 시간이다(실관측 LCP 646ms). 폰트 서브셋팅이 별도 후속 작업.
 */
export function Marquee({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      // 화면에 걸치기 직전에 미리 재생 — 스크롤로 진입하는 순간 멈춰 보이지 않게.
      rootMargin: '100px 0px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="flex w-max animate-edi-marquee whitespace-nowrap"
      style={{ animationPlayState: inView ? 'running' : 'paused' }}
    >
      {children}
    </div>
  );
}
