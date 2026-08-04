import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 공개 리뷰 목록·집계 (시퀀스 5b, 결정 ④) — prisma 모킹은 submit.test.ts 패턴.
 *
 * 고정하는 계약:
 *  - published 만 조회하고, 🔒 PII(authorNameSnapshot·ip)는 select 에 아예 없다.
 *  - 최신순 + id 타이브레이크, pageSize+1 로 다음 페이지 탐지 → nextCursor.
 *  - packageName 필터는 packageSnapshot.name JSON 경로.
 *  - packageSnapshot 이 비정상 형태(null·배열·name 비문자열)여도 packageName=null 로 강등.
 *  - 집계 0건이면 average=null (허위 표시 금지 — 표시측이 카드를 숨기는 근거).
 */
const h = vi.hoisted(() => ({
  reviewFindMany: vi.fn(),
  reviewAggregate: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    review: { findMany: h.reviewFindMany, aggregate: h.reviewAggregate },
  },
}));

import { REVIEWS_PAGE_SIZE, getReviewStats, listPublishedReviews } from './list';

function row(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    rating: 5,
    body: 'great',
    authorDisplay: '민수 K.',
    packageSnapshot: { name: 'Gold', category: 'experience', slotMinutes: 120, cdIncluded: true },
    language: 'en',
    createdAt: new Date('2026-08-01T00:00:00Z'),
    ...over,
  };
}

beforeEach(() => {
  h.reviewFindMany.mockReset();
  h.reviewAggregate.mockReset();
});

describe('listPublishedReviews', () => {
  it('published 만, 최신순+id 타이브레이크, PII 필드는 select 에 없다', async () => {
    h.reviewFindMany.mockResolvedValue([row('r1')]);
    await listPublishedReviews({});
    const arg = h.reviewFindMany.mock.calls[0][0];
    expect(arg.where.status).toBe('published');
    expect(arg.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(arg.select.authorNameSnapshot).toBeUndefined();
    expect(arg.select.ip).toBeUndefined();
    expect(arg.take).toBe(REVIEWS_PAGE_SIZE + 1);
  });

  it('pageSize 초과분으로 nextCursor 를 만든다 (마지막 행 id)', async () => {
    const rows = Array.from({ length: REVIEWS_PAGE_SIZE + 1 }, (_, i) => row(`r${i}`));
    h.reviewFindMany.mockResolvedValue(rows);
    const res = await listPublishedReviews({});
    expect(res.reviews).toHaveLength(REVIEWS_PAGE_SIZE);
    expect(res.nextCursor).toBe(`r${REVIEWS_PAGE_SIZE - 1}`);
  });

  it('마지막 페이지면 nextCursor=null', async () => {
    h.reviewFindMany.mockResolvedValue([row('r1'), row('r2')]);
    const res = await listPublishedReviews({});
    expect(res.reviews).toHaveLength(2);
    expect(res.nextCursor).toBeNull();
  });

  it('cursor 는 skip 1 과 함께 전달된다', async () => {
    h.reviewFindMany.mockResolvedValue([]);
    await listPublishedReviews({ cursor: 'r9' });
    const arg = h.reviewFindMany.mock.calls[0][0];
    expect(arg.cursor).toEqual({ id: 'r9' });
    expect(arg.skip).toBe(1);
  });

  it('packageName 필터는 packageSnapshot.name JSON 경로로 걸린다', async () => {
    h.reviewFindMany.mockResolvedValue([]);
    await listPublishedReviews({ packageName: 'Diamond' });
    const arg = h.reviewFindMany.mock.calls[0][0];
    expect(arg.where.packageSnapshot).toEqual({ path: ['name'], equals: 'Diamond' });
  });

  it('비정상 packageSnapshot 은 packageName=null 로 강등한다', async () => {
    h.reviewFindMany.mockResolvedValue([
      row('r1', { packageSnapshot: null }),
      row('r2', { packageSnapshot: ['x'] }),
      row('r3', { packageSnapshot: { name: 42 } }),
      row('r4'),
    ]);
    const res = await listPublishedReviews({});
    expect(res.reviews.map((r) => r.packageName)).toEqual([null, null, null, 'Gold']);
  });
});

describe('getReviewStats', () => {
  it('published 기준 count·avg(소수1 반올림)를 돌려준다', async () => {
    h.reviewAggregate.mockResolvedValue({ _count: { _all: 7 }, _avg: { rating: 4.5714 } });
    const s = await getReviewStats();
    expect(h.reviewAggregate.mock.calls[0][0].where.status).toBe('published');
    expect(s).toEqual({ count: 7, average: 4.6 });
  });

  it('0건이면 average=null — 표시측이 통계 카드를 숨기는 근거', async () => {
    h.reviewAggregate.mockResolvedValue({ _count: { _all: 0 }, _avg: { rating: null } });
    expect(await getReviewStats()).toEqual({ count: 0, average: null });
  });
});
