/**
 * 예약 임시저장(draft) 계약 — sessionStorage 단일 출처.
 *
 * PRD §5.3 "sessionStorage 임시 저장". 원래 `components/booking/slot-picker.tsx` 안에
 * 사유 상수/헬퍼로 있던 것을 홈 예약바(슬라이스 4e)와 공유하려고 끌어올렸다.
 *
 * ⚠ **키와 형태를 두 곳에 복제하지 말 것**(Home_Slice_Spec §14-①-4 "진실 이중화 방지").
 * 홈 예약바에서 고른 슬롯이 `/booking/schedule` 의 SlotPicker 로 이어지려면 양쪽이
 * 정확히 같은 키·같은 필드를 써야 한다. 복제하면 조용히 어긋난다.
 *
 * 이 모듈은 **읽기/쓰기 전용**이다. 슬롯 확정·Redis 락(CLAUDE §3.3)·결제는 기존 예약
 * 플로우가 단독 소유한다 — draft 는 UI 편의를 위한 힌트일 뿐 예약의 진실이 아니다.
 */
export const BOOKING_DRAFT_KEY = 'kingstudio.booking';

export type BookingDraft = {
  package: string;
  date: string;
  startTime: string;
  endTime: string;
};

/** draft 형태 검증 — 손상·구버전 값이 UI 로 새지 않게 막는다. */
export function isBookingDraft(value: unknown): value is BookingDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.package === 'string' &&
    d.package.length > 0 &&
    typeof d.date === 'string' &&
    typeof d.startTime === 'string' &&
    typeof d.endTime === 'string'
  );
}

export function readBookingDraft(): BookingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(BOOKING_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isBookingDraft(parsed) ? parsed : null;
  } catch {
    // sessionStorage 불가(프라이빗 모드/쿼터) 또는 JSON 손상 — 치명적이지 않다.
    return null;
  }
}

export function writeBookingDraft(draft: BookingDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // 저장 실패는 무시 — 상태는 메모리에 남고 다음 단계에서 다시 고르면 된다.
  }
}
