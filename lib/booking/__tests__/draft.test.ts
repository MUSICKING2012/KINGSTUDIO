import { beforeEach, describe, expect, it } from 'vitest';

import {
  BOOKING_DRAFT_KEY,
  isBookingDraft,
  readBookingDraft,
  writeBookingDraft,
} from '@/lib/booking/draft';

/**
 * ⚠ 위험 구역 인접 (CLAUDE.md §4) — 홈 예약바(슬라이스 4e)와 `/booking/schedule` 의
 * SlotPicker 가 **같은 draft 계약**을 쓰는지 고정한다. 이 계약이 갈리면 홈에서 고른 슬롯이
 * 다음 단계에서 조용히 사라진다(Home_Slice_Spec §14-①-4 진실 이중화 방지).
 *
 * draft 는 UI 힌트일 뿐 예약의 진실이 아니다 — 슬롯 확정·락·결제는 예약 플로우 소관이다.
 */

// jsdom 이 아닌 node 환경에서도 돌도록 최소 sessionStorage 스텁을 깐다.
function installSessionStorage() {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  };
  (globalThis as unknown as { window: unknown }).window = { sessionStorage: mock };
  return mock;
}

describe('booking draft 계약', () => {
  let storage: ReturnType<typeof installSessionStorage>;

  beforeEach(() => {
    storage = installSessionStorage();
  });

  const draft = {
    package: 'diamond',
    date: '2026-08-15',
    startTime: '14:00:00',
    endTime: '16:00:00',
  };

  it('키가 kingstudio.booking 으로 고정돼 있다 (SlotPicker 와 공유)', () => {
    expect(BOOKING_DRAFT_KEY).toBe('kingstudio.booking');
  });

  it('쓰고 그대로 읽는다 — 홈에서 고른 슬롯이 schedule 로 인계된다', () => {
    writeBookingDraft(draft);
    expect(readBookingDraft()).toEqual(draft);
  });

  it('저장 형태가 SlotPicker 가 기대하는 4필드 JSON 이다', () => {
    writeBookingDraft(draft);
    const raw = storage.getItem(BOOKING_DRAFT_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({
      package: 'diamond',
      date: '2026-08-15',
      startTime: '14:00:00',
      endTime: '16:00:00',
    });
  });

  it('값이 없으면 null', () => {
    expect(readBookingDraft()).toBeNull();
  });

  it('손상된 JSON 이면 던지지 않고 null', () => {
    storage.setItem(BOOKING_DRAFT_KEY, '{not json');
    expect(() => readBookingDraft()).not.toThrow();
    expect(readBookingDraft()).toBeNull();
  });

  it('필드가 빠진 구버전 값은 거른다 (UI 로 새지 않게)', () => {
    storage.setItem(BOOKING_DRAFT_KEY, JSON.stringify({ package: 'gold', date: '2026-08-15' }));
    expect(readBookingDraft()).toBeNull();
  });

  it('isBookingDraft 는 빈 package 슬러그를 거부한다', () => {
    expect(isBookingDraft({ ...draft, package: '' })).toBe(false);
    expect(isBookingDraft(draft)).toBe(true);
    expect(isBookingDraft(null)).toBe(false);
    expect(isBookingDraft('x')).toBe(false);
  });

  it('서버(window 없음)에서는 읽기 null, 쓰기는 무해', () => {
    (globalThis as unknown as { window?: unknown }).window = undefined;
    expect(readBookingDraft()).toBeNull();
    expect(() => writeBookingDraft(draft)).not.toThrow();
  });
});
