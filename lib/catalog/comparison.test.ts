import { describe, expect, it } from 'vitest';

import {
  COMPARISON_SLUGS,
  DELIVERABLE_MATRIX,
  DELIVERABLE_ROWS,
  buildComparison,
} from './comparison';

const pkgs = [
  { slug: 'gold', cdIncluded: true, slotMinutes: 120 },
  { slug: 'diamond', cdIncluded: true, slotMinutes: 120 },
  { slug: 'premium', cdIncluded: true, slotMinutes: 180 },
];

describe('DELIVERABLE_MATRIX', () => {
  it('행 집합이 DELIVERABLE_ROWS와 정확히 일치', () => {
    expect(Object.keys(DELIVERABLE_MATRIX).sort()).toEqual([...DELIVERABLE_ROWS].sort());
  });

  it('모든 행이 3개 슬러그를 빠짐없이 가진다', () => {
    for (const row of DELIVERABLE_ROWS) {
      expect(Object.keys(DELIVERABLE_MATRIX[row]).sort()).toEqual([...COMPARISON_SLUGS].sort());
    }
  });

  it('간이믹스와 정식마스터는 상호배타 (PRD 5.6 — Gold 간이 / Dia·Prem 정식)', () => {
    for (const slug of COMPARISON_SLUGS) {
      expect(DELIVERABLE_MATRIX.shortMix[slug] && DELIVERABLE_MATRIX.fullMaster[slug]).toBe(false);
    }
  });

  it('세로컷은 가로 MV 없이 존재할 수 없다 (Premium 전용 2종)', () => {
    for (const slug of COMPARISON_SLUGS) {
      if (DELIVERABLE_MATRIX.verticalCut[slug]) {
        expect(DELIVERABLE_MATRIX.musicVideo[slug]).toBe(true);
      }
    }
  });
});

describe('buildComparison', () => {
  it('COMPARISON_SLUGS 순서로 3열 생성', () => {
    expect(buildComparison(pkgs).map((c) => c.slug)).toEqual([...COMPARISON_SLUGS]);
  });

  it('cd·duration은 DB 값에서 온다 (상수 아님)', () => {
    const cols = buildComparison([{ slug: 'gold', cdIncluded: false, slotMinutes: 999 }]);
    expect(cols).toHaveLength(1);
    expect(cols[0].cdIncluded).toBe(false);
    expect(cols[0].slotMinutes).toBe(999);
  });

  it('미존재 슬러그는 열에서 제외', () => {
    expect(buildComparison([pkgs[0]]).map((c) => c.slug)).toEqual(['gold']);
    expect(buildComparison([])).toEqual([]);
  });
});
