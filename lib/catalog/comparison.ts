import type { Package } from '@prisma/client';

// 체험 3종(Gold/Diamond/Premium) 비교표 데이터 소스.
// 정본: PRD §5.6 O2 + Reconciliation_Decision_v1 §2.
// 값 출처가 둘로 나뉜다 (의도된 분리):
//  (a) 상수 7행 = 딜리버러블. DB 컬럼 없음, PRD가 유일 정본.
//  (b) DB 파생 2행 = cd(Package.cdIncluded) / duration(Package.slotMinutes).
// CD를 상수로 복제하면 어드민 패키지 관리 도입 시 DB와 조용히 어긋난다.
// checkout/page.tsx·booking/confirm이 이미 pkg.cdIncluded를 읽으므로 DB가 정본.
// 대여·단체는 비교 축이 달라 제외(PRD §5.4 카테고리 격리).

export const COMPARISON_SLUGS = ['gold', 'diamond', 'premium'] as const;
export type ComparisonSlug = (typeof COMPARISON_SLUGS)[number];

export const DELIVERABLE_ROWS = [
  'rawAudio',
  'shortMix',
  'fullMaster',
  'photos',
  'vocalReport',
  'musicVideo',
  'verticalCut',
] as const;
export type DeliverableRow = (typeof DELIVERABLE_ROWS)[number];

export const DELIVERABLE_MATRIX: Record<DeliverableRow, Record<ComparisonSlug, boolean>> = {
  rawAudio: { gold: true, diamond: true, premium: true },
  shortMix: { gold: true, diamond: false, premium: false },
  fullMaster: { gold: false, diamond: true, premium: true },
  photos: { gold: true, diamond: true, premium: true },
  vocalReport: { gold: true, diamond: false, premium: false },
  musicVideo: { gold: false, diamond: false, premium: true },
  verticalCut: { gold: false, diamond: false, premium: true },
};

export type ComparisonPackage = Pick<Package, 'slug' | 'cdIncluded' | 'slotMinutes'>;

export interface ComparisonColumn {
  slug: ComparisonSlug;
  deliverables: Record<DeliverableRow, boolean>;
  cdIncluded: boolean;
  slotMinutes: number;
}

/** COMPARISON_SLUGS 순서 보존. 미존재 슬러그는 제외(로케일 필터 대응). */
export function buildComparison(packages: ComparisonPackage[]): ComparisonColumn[] {
  const columns: ComparisonColumn[] = [];
  for (const slug of COMPARISON_SLUGS) {
    const pkg = packages.find((p) => p.slug === slug);
    if (!pkg) continue;
    const deliverables = {} as Record<DeliverableRow, boolean>;
    for (const row of DELIVERABLE_ROWS) {
      deliverables[row] = DELIVERABLE_MATRIX[row][slug];
    }
    columns.push({ slug, deliverables, cdIncluded: pkg.cdIncluded, slotMinutes: pkg.slotMinutes });
  }
  return columns;
}
