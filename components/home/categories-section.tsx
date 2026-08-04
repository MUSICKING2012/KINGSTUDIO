import { getTranslations } from 'next-intl/server';

import { EditorialImage } from '@/components/home/editorial-image';
import { listPackages } from '@/lib/catalog/queries';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';

/**
 * Categories. 실측 소스 = `design/KING STUDIO Editorial.dc.html` 136–162행.
 * 스펙 = `docs/specs/Home_Slice_Spec.md` §4 (슬라이스 4c), 결정 ④ = A(4항목 매핑).
 *
 * `id="sessions"` 는 Provide 섹션 `learnMore` 링크의 앵커 대상이다(§3-A).
 *
 * **서버 컴포넌트 + DB read.** rental 노출 판정을 하드코딩 로케일 allow-list 가 아니라
 * `listPackages({locale})` 결과로 한다(§4-C). 1Hour·1Pro 는 `languagesAvailable = ['ko']`
 * 이므로 비-ko 에서는 rental 카테고리 패키지가 0건이고, `/rental` 은 `CategoryCatalog` 가
 * `notFound()` 로 죽인다(`components/catalog/category-catalog.tsx:38-39`). 그 라우트로
 * 링크를 걸면 404 를 만들므로 비-ko 에서는 비인터랙티브 `<span>` + `sr-only` 안내로 렌더한다
 * (Nav 슬라이스 `enabled:false` 패턴 재사용, 죽은 링크 0 원칙).
 *
 * 디자인 대비 의도적 델타:
 *  - **활성/비활성 색 스킴 미채택.** 디자인(585–587행)은 비활성 항목을 `rgba(20,18,16,.22)`
 *    (계산 ≈1.5:1)로 흐리고 활성만 잉크로 둔다 — AA 대폭 미달이고 상태를 색만으로 전달해
 *    §3.9 위반이다. 모든 라벨을 `text-foreground` 로 두고, 강조는 `aria-hidden` 장식 배지의
 *    accent 채움으로만 표현한다(장식이므로 색 단독 전달 문제 자체가 성립하지 않음).
 *  - 캡션 `/.55`, INQUIRY ONLY pill `/.55` → 12px·10px 소형 텍스트라 `/70` 으로 상향.
 *
 * 배지 숫자는 장식 인덱스다(디자인 581행 주석 실측: "never performance counts") → `aria-hidden`.
 */

// 결정 ④-A 매핑. href 는 전부 07-31 실측 실존 라우트.
// localeGated: rental 만 true — 비-ko 에서 링크를 만들지 않는다(§4-C).
const CATEGORIES = [
  { key: 'vocal', href: '/product', localeGated: false },
  { key: 'mv', href: '/packages/premium', localeGated: false },
  { key: 'making', href: '/group', localeGated: false },
  { key: 'rental', href: '/rental', localeGated: true },
] as const;

// 디자인 prop `catActiveIndex` 기본값 1 = MUSIC VIDEO. 순수 장식.
const ACCENT_INDEX = 1;

const BADGE_ACCENT = 'bg-primary text-foreground';
const BADGE_PLAIN = 'bg-foreground/10 text-foreground/70';

export async function CategoriesSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.categories' });

  // 데이터 기반 로케일 게이트 — 하드코딩 allow-list 금지(§4-C).
  //
  // ⚠ 실패 시 우아한 강등. 이 섹션 때문에 홈이 DB 에 하드 의존하게 되면, 정적이던 최상위
  // 트래픽·SEO 페이지가 DB 장애에 같이 죽는다(4c 착수 중 실측: DB 불통 시 홈 전체 500).
  // 카탈로그의 환율 조회 실패 처리와 같은 패턴(`category-catalog.tsx:42-45`).
  // 강등 방향은 **비링크**다 — 오판으로 링크를 만들면 비-ko 에서 404 가 되지만,
  // 링크를 안 만들면 최악이 "ko 사용자가 푸터·nav 로 우회"에 그친다.
  const packages = await listPackages({ locale: toPrismaLocale(locale as Locale) }).catch((e) => {
    console.error('[home/categories] listPackages failed, rental gate closed:', e);
    return [];
  });
  const rentalVisible = packages.some((p) => p.category === 'rental');

  return (
    <section
      id="sessions"
      className="mx-auto flex max-w-container-max flex-wrap items-center justify-between gap-[30px] px-gutter py-[clamp(40px,6vw,72px)]"
    >
      {/* 좌 이미지 열 (디자인 138–143행) */}
      <div className="order-1 flex w-[min(240px,42vw)] flex-none flex-col gap-[14px]">
        <div className="aspect-[3/3.6] overflow-hidden rounded-ks-img">
          <EditorialImage alt={t('image1Alt')} className="h-full" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-foreground">{t('cap1Title')}</div>
          <div className="text-[12px] text-foreground/70">{t('cap1Sub')}</div>
        </div>
      </div>

      {/* 중앙 카테고리 리스트 (디자인 145–153행) */}
      <ul className="order-2 flex min-w-[280px] flex-1 list-none flex-col gap-1 text-center">
        {CATEGORIES.map((cat, i) => {
          const label = t(`items.${cat.key}`);
          const linked = !cat.localeGated || rentalVisible;
          return (
            <li key={cat.key} className="flex items-center justify-center gap-3">
              {linked ? (
                <Link
                  href={cat.href}
                  className="ks-display ks-display-strong text-[clamp(26px,3.8vw,46px)] leading-[1.08] text-foreground"
                >
                  {label}
                </Link>
              ) : (
                <span className="ks-display ks-display-strong cursor-default text-[clamp(26px,3.8vw,46px)] leading-[1.08] text-foreground">
                  {label}
                  <span className="sr-only"> ({t('rentalKoOnly')})</span>
                </span>
              )}

              <span
                aria-hidden="true"
                className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-[11px] font-extrabold ${
                  i === ACCENT_INDEX ? BADGE_ACCENT : BADGE_PLAIN
                }`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              {cat.localeGated && (
                <span className="flex-none whitespace-nowrap rounded-full border border-foreground/25 px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] text-foreground/70">
                  {t('inquiryOnly')}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {/* 우 이미지 열 (디자인 155–160행) */}
      <div className="order-3 flex w-[min(240px,42vw)] flex-none flex-col gap-[14px]">
        <div className="aspect-[3/3.6] overflow-hidden rounded-ks-img">
          <EditorialImage alt={t('image2Alt')} className="h-full" />
        </div>
        <div>
          <div className="text-[14px] font-bold text-foreground">{t('cap2Title')}</div>
          <div className="text-[12px] text-foreground/70">{t('cap2Sub')}</div>
        </div>
      </div>
    </section>
  );
}
