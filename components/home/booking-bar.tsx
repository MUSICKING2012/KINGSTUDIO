'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { writeBookingDraft } from '@/lib/booking/draft';
import { useRouter } from '@/lib/i18n/navigation';

/**
 * ⚠ **위험 구역 인접 — 검증 필요 (CLAUDE.md §4).**
 *
 * 홈 예약바. 실측 소스 = `design/KING STUDIO Editorial.dc.html` 189–227행.
 * 스펙 = `docs/specs/Home_Slice_Spec.md` §6 + §14-① (슬라이스 4e).
 * 결정 ① = **C(실 슬롯 배선)** — `/api/availability` 를 직접 호출한다.
 *
 * ── 하드 제약 (§14-①-5) ────────────────────────────────────────────────
 * 이 컴포넌트는 **읽기 전용**이다. 슬롯 확정·Redis 분산락(CLAUDE §3.3)·결제 진입은
 * 기존 예약 플로우(`/booking/schedule` → `options` → `checkout`)가 단독 소유한다.
 * 여기서 락을 잡거나 예약을 쓰지 않는다. 표시한 가용성은 조회 시점 스냅샷이며,
 * 실제 확정은 다음 단계에서 다시 검증된다.
 *
 * ── 진실 이중화 방지 (§14-①-4) ────────────────────────────────────────
 * draft 계약은 `lib/booking/draft.ts` 단일 출처를 쓴다. 여기서 고른 슬롯을 draft 로
 * 남기면 `/booking/schedule` 의 `SlotPicker` 가 그대로 복원한다(같은 키·같은 필드).
 * 슬롯 그리드의 진실은 `/api/availability` 하나뿐 — 디자인의 `isFull()`(521행) 가짜
 * 해시와 `PKG.slots`(296–299행) 데모 배열은 이식 금지다(§11-D).
 *
 * ── 성능 (§14-①-3) ────────────────────────────────────────────────────
 * 슬롯 fetch 는 사용자가 날짜를 고른 뒤에만 일어난다. 초기 HTML 에는 슬롯 요청이 없어
 * 홈 첫 렌더 비용에 영향을 주지 않는다.
 *
 * ── 디자인 대비 의도적 델타 ───────────────────────────────────────────
 * - CTA 라벨 `#fff` -> `text-foreground`. 15px w800 은 WCAG large 임계 미만이라 4.5:1
 *   필요, 흰 글자는 3.4:1(§11-W).
 * - 다크 위 소형 텍스트 알파 하한 `/65`. 디자인의 `.5` 미채택.
 * - **인원 필드 미렌더.** 디자인 212행 `showGuests` 는 채택하지 않는다 — 인원은
 *   `/booking/options`(Stage C)가 소유하고 `/booking/schedule` 는 `package` 만 받는다.
 *   여기서 받아봐야 다음 단계에서 버려지므로, 입력받고 버리는 가짜 UI 가 된다(결정 ⑩).
 * - CTA 보조라인 = 선택 패키지의 **1인 기준가**(서버가 포맷해 내려준 문자열). 디자인의
 *   `totalStr` 은 인원 반영 총액인데 위 사유로 인원을 받지 않으므로, 총액으로 표기하면
 *   사실과 어긋난다. "1인 기준" 라벨을 붙인 가격으로 바꾼다.
 */

type SlotStatus = { startTime: string; endTime: string; available: boolean };

export type BookingBarPackage = {
  slug: string;
  name: string;
  /**
   * 서버가 `<Price>` 로 렌더한 1인 기준가 노드(+ fromLabel). 클라이언트는 표시만 한다.
   * 문자열로 만들지 않고 노드를 그대로 받는 이유: 통화·환율 포맷 규칙을 재구현하지 않고
   * 기존 `components/price/price.tsx` 를 단일 출처로 쓰기 위함이다.
   */
  priceLabel: React.ReactNode;
};

export type BookingBarLabels = {
  title: string;
  kstNote: string;
  fService: string;
  fDate: string;
  fTime: string;
  cta: string;
  full: string;
  pickDate: string;
  loading: string;
  loadError: string;
  retry: string;
  noSlots: string;
  note: string;
};

type Phase = 'idle' | 'loading' | 'loaded' | 'error';

// "HH:MM:00" → "HH:MM"
const hhmm = (t: string) => t.slice(0, 5);

const FIELD = 'flex flex-col gap-1 rounded-ks-field bg-ink-raise px-[15px] py-[11px]';
const FIELD_LABEL = 'text-[9.5px] font-bold uppercase tracking-[0.12em] text-paper/65';
const CONTROL =
  'w-full border-none bg-transparent py-0.5 text-[14.5px] font-bold text-paper outline-none';

export function BookingBar({
  packages,
  minDate,
  maxDate,
  locale,
  labels,
}: {
  packages: BookingBarPackage[];
  minDate: string;
  maxDate: string;
  locale: string;
  labels: BookingBarLabels;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(packages[0]?.slug ?? '');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<SlotStatus[]>([]);
  const [startTime, setStartTime] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const abortRef = useRef<AbortController | null>(null);

  const loadSlots = useCallback(
    async (pkg: string, d: string) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setPhase('loading');
      setStartTime('');
      try {
        const res = await fetch(
          `/api/availability?package=${encodeURIComponent(pkg)}&date=${d}&locale=${locale}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error(`availability ${res.status}`);
        const data = (await res.json()) as { slots?: SlotStatus[] };
        setSlots(data.slots ?? []);
        setPhase('loaded');
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setPhase('error');
      }
    },
    [locale],
  );

  useEffect(() => {
    if (slug && date && date >= minDate && date <= maxDate) loadSlots(slug, date);
  }, [slug, date, minDate, maxDate, loadSlots]);

  const selected = slots.find((s) => s.startTime === startTime && s.available);

  const onContinue = () => {
    if (!slug) return;
    // 슬롯까지 골랐으면 draft 로 넘겨 SlotPicker 가 복원하게 한다. 아니면 패키지만 들고 간다.
    if (selected && date) {
      writeBookingDraft({
        package: slug,
        date,
        startTime: selected.startTime,
        endTime: selected.endTime,
      });
    }
    router.push(`/booking/schedule?package=${encodeURIComponent(slug)}`);
  };

  const activePkg = packages.find((p) => p.slug === slug);
  const openSlots = slots.filter((s) => s.available);

  return (
    <section
      id="bookbar"
      className="mx-auto max-w-container-max px-gutter pb-[clamp(40px,6vw,72px)]"
    >
      <div className="rounded-ks-bar bg-ink-deep p-[14px] text-paper">
        <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-[14px] pt-1.5">
          <span className="ks-display text-[clamp(18px,2.2vw,26px)]">{labels.title}</span>
          <span className="text-[11.5px] text-paper/65">{labels.kstNote}</span>
        </div>

        <div className="flex flex-wrap items-stretch gap-[9px]">
          <label className={`${FIELD} min-w-[190px] flex-[1.3_1_210px]`}>
            <span className={FIELD_LABEL}>{labels.fService}</span>
            <select
              className={`${CONTROL} cursor-pointer`}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            >
              {packages.map((p) => (
                <option key={p.slug} value={p.slug} className="text-foreground">
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className={`${FIELD} min-w-[150px] flex-[0.7_1_160px]`}>
            <span className={FIELD_LABEL}>{labels.fDate}</span>
            <input
              type="date"
              className={`${CONTROL} [color-scheme:dark]`}
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>

          <label className={`${FIELD} min-w-[150px] flex-[0.7_1_160px]`}>
            <span className={FIELD_LABEL}>{labels.fTime}</span>
            <select
              className={`${CONTROL} cursor-pointer`}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={phase !== 'loaded' || openSlots.length === 0}
            >
              <option value="" className="text-foreground">
                {!date
                  ? labels.pickDate
                  : phase === 'loading'
                    ? labels.loading
                    : phase === 'error'
                      ? labels.loadError
                      : openSlots.length === 0
                        ? labels.noSlots
                        : labels.pickDate}
              </option>
              {/* 마감 슬롯도 노출하되 선택 불가 — 상태를 색이 아니라 텍스트로 전달한다(§3.9). */}
              {slots.map((s) => (
                <option
                  key={s.startTime}
                  value={s.startTime}
                  disabled={!s.available}
                  className="text-foreground"
                >
                  {hhmm(s.startTime)}–{hhmm(s.endTime)}
                  {s.available ? '' : ` · ${labels.full}`}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onContinue}
            className="flex min-h-[62px] min-w-[200px] flex-[1_1_220px] items-center justify-between rounded-ks-field bg-primary px-[18px] py-2.5 text-foreground"
          >
            <span className="flex flex-col items-start gap-px">
              <span className="ks-display text-[15px]">{labels.cta}</span>
              {activePkg && (
                <span className="text-[11px] font-semibold">{activePkg.priceLabel}</span>
              )}
            </span>
            <span aria-hidden="true" className="text-[18px]">
              →
            </span>
          </button>
        </div>

        {phase === 'error' && (
          <div className="flex items-center gap-3 px-2 pt-3">
            <p className="text-[11px] text-paper/65">{labels.loadError}</p>
            <button
              type="button"
              onClick={() => date && loadSlots(slug, date)}
              className="rounded-full border border-paper/40 px-3 py-1 text-[11px] font-bold text-paper"
            >
              {labels.retry}
            </button>
          </div>
        )}

        <p aria-live="polite" className="px-2 pb-1 pt-3 text-[11px] text-paper/65">
          {labels.note}
        </p>
      </div>
    </section>
  );
}
