import { cn } from '@/lib/utils';

/**
 * 에디토리얼 이미지 슬롯 (Home_Slice_Spec §1-E, 결정 ③-A).
 *
 * 실 스튜디오 사진 미확보 상태(CLAUDE.md §9 pre-flight, `public/` 비어 있음)에서 쓰는 중립
 * 플레이스홀더. 디자인의 `<x-import image-slot>`(DC 런타임 전용)을 대체한다.
 *
 * - 비율은 **호출측이 `className`으로 준다**(`aspect-[3/3.4]` 등). Tailwind JIT 는 arbitrary
 *   값을 소스에서 리터럴로 스캔하므로 prop 으로 문자열을 넘기면 클래스가 생성되지 않는다.
 *   → 스펙 §1-E 의 `ratio` prop 안은 채택하지 않았다.
 * - 비율 고정 박스라 실사진 주입 전후로 **CLS 0**. `src` 가 생기면 이 파일만 next/image 로
 *   교체하고 호출처 8곳은 건드리지 않는다.
 * - **접근성:** 이미지가 실제로 없는 동안은 `aria-hidden` 장식 박스로 렌더한다. 빈 박스에
 *   `role="img"` + `aria-label` 을 붙이면 스크린리더가 존재하지 않는 사진을 읽어 준다(허위 안내).
 *   `alt` 는 필수 prop 으로 유지해 호출처가 i18n 키를 미리 배선하도록 강제하고, 실사진 도입
 *   시점에 그대로 활성화된다.
 */
export function EditorialImage({ alt, className }: { alt: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-placeholder-alt={alt}
      className={cn('w-full bg-paper-dim', className)}
    />
  );
}
