import { cn } from '@/lib/utils';
import Image from 'next/image';

/**
 * 에디토리얼 이미지 슬롯 (Home_Slice_Spec §1-E, 결정 ③-A).
 *
 * `src` 없으면 중립 플레이스홀더(실사진 미확보 슬롯), 있으면 next/image 실사진 렌더.
 * 5d-3 fill-in(2026-08-07)에서 /studios 실사진 도입으로 src 경로가 활성화됐다 —
 * 설계 의도대로 이 파일만 확장, 플레이스홀더 호출처는 무변경.
 *
 * - 비율은 **호출측이 `className`으로 준다**(`aspect-[3/3.4]` 등). Tailwind JIT 는 arbitrary
 *   값을 소스에서 리터럴로 스캔하므로 prop 으로 문자열을 넘기면 클래스가 생성되지 않는다.
 *   → 스펙 §1-E 의 `ratio` prop 안은 채택하지 않았다.
 * - 비율 고정 박스 + next/image `fill`이라 실사진 전후 **CLS 0**.
 * - **접근성:** 플레이스홀더 동안은 `aria-hidden` 장식 박스(빈 박스에 `role="img"`를 붙이면
 *   존재하지 않는 사진을 읽어 주는 허위 안내). `alt` 는 필수 prop — 실사진 전환 시 그대로 활성화.
 * - `sizes` 는 실사진 호출처가 레이아웃 폭에 맞게 지정(반응형 srcset 최적화 — Gate 3 성능).
 */
export function EditorialImage({
  alt,
  src,
  sizes,
  priority,
  className,
}: {
  alt: string;
  src?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        aria-hidden="true"
        data-placeholder-alt={alt}
        className={cn('w-full bg-paper-dim', className)}
      />
    );
  }
  return (
    <div className={cn('relative w-full bg-paper-dim', className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? '100vw'}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
