import { getTranslations } from 'next-intl/server';

import {
  type ComparisonColumn,
  type ComparisonSlug,
  DELIVERABLE_ROWS,
  type DeliverableRow,
} from '@/lib/catalog/comparison';

// S-P1c 비교표 UI (PRD §5.6 O2). 데이터는 buildComparison() 산출물을 그대로 그린다.
// Diamond 카드는 primary(#F5461E) 채움 / Premium 잉크(foreground) 채움 / Gold 화이트 카드.
// 대비 규칙(CLAUDE.md §2 accent 제약): Diamond 본문 행은 잉크 텍스트(ink/#F5461E ≈ 5.1:1, AA
// 통과). 흰색은 카드명(headline-lg, AA-large)에만 허용 — 흰색 소형 텍스트(3.6:1)는 금지.
// 포함/미포함은 색만으로 전달하지 않는다(§3.9): 아이콘 형태 차이(check/minus) + sr-only 텍스트.
// notIncluded 행은 텍스트 dimming을 두지 않는다 — Diamond primary 위 대비를 지키기 위함.
const ROW_LABEL_KEY: Record<DeliverableRow, string> = {
  rawAudio: 'rowRawAudio',
  shortMix: 'rowShortMix',
  fullMaster: 'rowFullMaster',
  photos: 'rowPhotos',
  vocalReport: 'rowVocalReport',
  musicVideo: 'rowMusicVideo',
  verticalCut: 'rowVerticalCut',
};

type CardStyle = { card: string; name: string; body: string; divide: string };

const CARD_STYLE: Record<ComparisonSlug, CardStyle> = {
  gold: {
    card: 'border border-border bg-card',
    name: 'text-foreground',
    body: 'text-foreground',
    divide: 'divide-border',
  },
  diamond: {
    card: 'bg-primary',
    name: 'text-white',
    body: 'text-foreground',
    divide: 'divide-foreground/20',
  },
  premium: {
    card: 'bg-foreground',
    name: 'text-white',
    body: 'text-background',
    divide: 'divide-background/20',
  },
};

function IconCheck() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconMinus() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M5 10h10" strokeLinecap="round" />
    </svg>
  );
}

export async function PackageComparison({
  locale,
  columns,
}: {
  locale: string;
  columns: ComparisonColumn[];
}) {
  if (columns.length === 0) return null;
  const t = await getTranslations({ locale, namespace: 'packages' });
  const compare = t.raw('compare') as Record<string, string>;
  const pkgItems = t.raw('items') as Record<string, { name: string }>;

  const mark = (included: boolean) => (
    <span className="flex items-center">
      {included ? <IconCheck /> : <IconMinus />}
      <span className="sr-only">{included ? compare.included : compare.notIncluded}</span>
    </span>
  );

  return (
    <div className="mt-stack-lg">
      <h3 className="font-display text-headline-lg text-foreground">{compare.title}</h3>
      <div className="mt-stack-lg grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((col) => {
          const style = CARD_STYLE[col.slug];
          return (
            <article
              key={col.slug}
              className={`flex flex-col rounded-brand-card p-stack-lg ${style.card}`}
            >
              <h4 className={`font-display text-headline-lg ${style.name}`}>
                {pkgItems[col.slug]?.name}
              </h4>
              <ul className={`mt-stack-md divide-y text-body-md ${style.divide} ${style.body}`}>
                {DELIVERABLE_ROWS.map((row) => (
                  <li
                    key={row}
                    className="flex items-center justify-between gap-stack-sm py-stack-sm"
                  >
                    <span>{compare[ROW_LABEL_KEY[row]]}</span>
                    {mark(col.deliverables[row])}
                  </li>
                ))}
                <li className="flex items-center justify-between gap-stack-sm py-stack-sm">
                  <span>{compare.rowCd}</span>
                  {mark(col.cdIncluded)}
                </li>
                <li className="flex items-center justify-between gap-stack-sm py-stack-sm">
                  <span>{compare.rowDuration}</span>
                  <span className="font-semibold">
                    {t('catalog.durationLabel', { minutes: col.slotMinutes })}
                  </span>
                </li>
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
