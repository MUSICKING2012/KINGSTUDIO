import { getTranslations } from 'next-intl/server';

import { EditorialImage } from '@/components/home/editorial-image';
import { Link } from '@/lib/i18n/navigation';

/**
 * Categories. 실측 소스 = `design/KING STUDIO Editorial.dc.html` 136–162행.
 * 스펙 = `docs/specs/Home_Slice_Spec.md` §4 (슬라이스 4c), 결정 ④ = A(4항목 매핑).
 *
 * `id="sessions"` 는 Provide 섹션 `learnMore` 링크의 앵커 대상이다(§3-A).
 *
 * 5d-3: rental 의 DB 로케일 게이트(listPackages 판정 + 비-ko 비링크 강등)를 제거했다 —
 * `/studios` 가 전 로케일 소개 페이지(200)로 전환되어(`Studio_Slice_Spec.md` §4-B)
 * 죽은 링크 위험 자체가 사라졌고, 이 섹션은 DB read 없는 순수 프리젠테이션으로 돌아간다.
 * "한국어 전용" 필(`koreanOnly`)은 대여 **서비스**의 실제 제약이라 유지.
 *
 * 디자인 대비 의도적 델타:
 *  - **활성/비활성 색 스킴 미채택.** 디자인(585–587행)은 비활성 항목을 `rgba(20,18,16,.22)`
 *    (계산 ≈1.5:1)로 흐리고 활성만 잉크로 둔다 — AA 대폭 미달이고 상태를 색만으로 전달해
 *    §3.9 위반이다. 모든 라벨을 `text-foreground` 로 두고, 강조는 `aria-hidden` 장식 배지의
 *    accent 채움으로만 표현한다(장식이므로 색 단독 전달 문제 자체가 성립하지 않음).
 *  - 캡션 `/.55`, rental pill `/.55` → 12px·10px 소형 텍스트라 `/70` 으로 상향.
 *  - **디자인 "INQUIRY ONLY" 필 문구 미채택.** 1Hour·1Pro 는 `bookingFlow=instant_payment`
 *    (PRD §5.2, 문의제 아님 — 5d-2 결정 ② 후속 정정). 필은 실제 제약인 "한국어 전용"
 *    (`koreanOnly`)을 표기한다 — `Studio_Slice_Spec.md` §2-②.
 *
 * 배지 숫자는 장식 인덱스다(디자인 581행 주석 실측: "never performance counts") → `aria-hidden`.
 */

// 결정 ④-A 매핑. href 는 전부 실존 라우트(5d-3 부터 /studios 는 전 로케일 200).
// pill: rental 만 — 대여 서비스가 한국어 전용이라는 사실 배지(라우트 게이트 아님).
const CATEGORIES = [
  { key: 'vocal', href: '/product', pill: false },
  { key: 'mv', href: '/packages/premium', pill: false },
  { key: 'making', href: '/group', pill: false },
  { key: 'rental', href: '/studios', pill: true }, // 5d-1 리네임(구 /rental 은 308)
] as const;

// 디자인 prop `catActiveIndex` 기본값 1 = MUSIC VIDEO. 순수 장식.
const ACCENT_INDEX = 1;

const BADGE_ACCENT = 'bg-primary text-foreground';
const BADGE_PLAIN = 'bg-foreground/10 text-foreground/70';

export async function CategoriesSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'home.categories' });

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
          return (
            <li key={cat.key} className="flex items-center justify-center gap-3">
              <Link
                href={cat.href}
                className="ks-display ks-display-strong text-[clamp(26px,3.8vw,46px)] leading-[1.08] text-foreground"
              >
                {label}
              </Link>

              <span
                aria-hidden="true"
                className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-full text-[11px] font-extrabold ${
                  i === ACCENT_INDEX ? BADGE_ACCENT : BADGE_PLAIN
                }`}
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              {cat.pill && (
                <span className="flex-none whitespace-nowrap rounded-full border border-foreground/25 px-2.5 py-1 text-[10px] font-extrabold tracking-[0.06em] text-foreground/70">
                  {t('koreanOnly')}
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
