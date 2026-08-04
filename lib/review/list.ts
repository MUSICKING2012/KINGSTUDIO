import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

/**
 * 공개 리뷰 목록·집계 (시퀀스 5b, 결정 ④).
 *
 * 노출 규칙: `status=published` 만. select 는 표시 필드로 한정하고 🔒 PII 필드
 * (`authorNameSnapshot`·`ip`)는 조회하지 않는다 — 목록 페이지가 만질 이유가 없다(§3.6).
 * 언어 필터 없음(결정 ④: 전체 언어 표시 — 초기 리뷰 양이 적어 필터 시 빈 화면 위험).
 *
 * 정렬 = 최신순(createdAt desc) + id desc 타이브레이크(같은 밀리초 생성 시 커서 결정성).
 * 커서 = 마지막 행의 id (Prisma cursor + skip 1).
 *
 * 패키지 필터는 `packageSnapshot.name` JSON 경로 equals — canonical 형태는 confirm
 * route 가 쓰는 `{name, category, slotMinutes, cdIncluded}` (app/api/booking/confirm 실측).
 * 값은 쿼리 파라미터에서 오지만 Prisma 파라미터라 주입 위험은 없고, 매치 없으면 빈 목록일 뿐이다.
 */

export const REVIEWS_PAGE_SIZE = 12;

export type PublicReview = {
  id: string;
  rating: number;
  body: string | null;
  authorDisplay: string;
  packageName: string | null;
  language: string;
  createdAt: Date;
};

export type ReviewListResult = {
  reviews: PublicReview[];
  /** 다음 페이지 커서(마지막 행 id). 더 없으면 null. */
  nextCursor: string | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  authorDisplay: string;
  packageSnapshot: Prisma.JsonValue;
  language: string;
  createdAt: Date;
};

function toPublic(row: ReviewRow): PublicReview {
  const snap = row.packageSnapshot;
  const packageName =
    snap && typeof snap === 'object' && !Array.isArray(snap) && typeof snap.name === 'string'
      ? snap.name
      : null;
  return {
    id: row.id,
    rating: row.rating,
    body: row.body,
    authorDisplay: row.authorDisplay,
    packageName,
    language: row.language,
    createdAt: row.createdAt,
  };
}

export async function listPublishedReviews(opts: {
  cursor?: string | null;
  packageName?: string | null;
  pageSize?: number;
}): Promise<ReviewListResult> {
  const { cursor = null, packageName = null, pageSize = REVIEWS_PAGE_SIZE } = opts;

  const rows = (await prisma.review.findMany({
    where: {
      status: 'published',
      ...(packageName ? { packageSnapshot: { path: ['name'], equals: packageName } } : {}),
    },
    select: {
      id: true,
      rating: true,
      body: true,
      authorDisplay: true,
      packageSnapshot: true,
      language: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: pageSize + 1, // +1 = 다음 페이지 존재 탐지
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })) as ReviewRow[];

  const hasMore = rows.length > pageSize;
  const page = hasMore ? rows.slice(0, pageSize) : rows;
  return {
    reviews: page.map(toPublic),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export type ReviewStats = { count: number; average: number | null };

/** published 전체 기준 집계. 0건이면 average=null — 표시측은 통계 카드를 렌더하지 않는다(허위 표시 금지). */
export async function getReviewStats(): Promise<ReviewStats> {
  const agg = await prisma.review.aggregate({
    where: { status: 'published' },
    _count: { _all: true },
    _avg: { rating: true },
  });
  const count = agg._count._all;
  return {
    count,
    average: count > 0 && agg._avg.rating != null ? Math.round(agg._avg.rating * 10) / 10 : null,
  };
}
