import { useTranslations } from 'next-intl';

import { CurrencySelector } from './currency-selector';
import { LocaleSelector } from './locale-selector';

import { Link } from '@/lib/i18n/navigation';
import { NAV_ITEMS } from '@/lib/nav/items';

import { MyPageNavItem } from './my-page-nav-item';

/**
 * 에디토리얼 상단 nav. 실측 소스 = KING STUDIO Editorial.dc.html <header data-screen-label="Nav">.
 * 서버 컴포넌트 — 클라이언트 경계는 셀렉터 2종만.
 *
 * 색 리터럴 → 토큰 매핑 (hex 는 globals.css :root 가 SoT. 여기에 값을 적지 않는다):
 *   rgba(240,238,233,.9) = paper 90% -> bg-background/90
 *   rgba(20,18,16,.08)   = ink 8%    -> border-foreground/[0.08]
 *   accent 채움                       -> bg-primary
 *
 * 타이포: C17 규약에 따라 신규 화면은 기존 fontSize 스케일을 쓰지 않고 arbitrary value 를 쓴다.
 * 워드마크는 .ks-display-strong 티어(DESIGN.md 명시).
 *
 * nav 활성/비활성 = lib/nav/items.ts 단일 출처. enabled:false 는 <span> 렌더.
 * (미존재 링크는 [...rest] catch-all 이 받아 오답 페이지가 되므로 링크를 만들지 않는다.)
 * aria-disabled/title 은 쓰지 않는다 — 전자는 상호작용 요소용이라 span 에서 무의미하고,
 * 후자는 모바일·키보드에 표시되지 않는다. 안내는 sr-only 로만 전달한다.
 *
 * 델타: Book now 라벨 white -> text-foreground (accent 위 흰 글자 3.6:1, AA 미달).
 */
export function SiteHeader() {
  const t = useTranslations('nav');

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/[0.08] bg-background/90 backdrop-blur-[8px]">
      <div className="mx-auto flex min-h-[66px] max-w-container-max flex-wrap items-center gap-5 px-gutter">
        <Link
          href="/"
          aria-label={t('home')}
          className="flex flex-none items-center gap-[9px] no-underline"
        >
          <span
            aria-hidden="true"
            className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-foreground text-[14px] font-extrabold text-background"
          >
            K
          </span>
          <span className="ks-display ks-display-strong text-[16px] tracking-[0.02em] text-foreground">
            KING STUDIO
          </span>
        </Link>

        <nav
          aria-label={t('primary')}
          className="flex min-w-0 flex-1 justify-center gap-6 overflow-x-auto"
        >
          {NAV_ITEMS.map((item) =>
            item.enabled ? (
              <Link
                key={item.key}
                href={item.href}
                className="whitespace-nowrap text-[16px] font-semibold text-foreground"
              >
                {t(item.key)}
              </Link>
            ) : (
              <span
                key={item.key}
                className="cursor-default whitespace-nowrap text-[16px] font-semibold text-foreground/40"
              >
                {t(item.key)}
                <span className="sr-only"> ({t('comingSoon')})</span>
              </span>
            ),
          )}
          <MyPageNavItem />
        </nav>

        <div className="flex flex-none items-center gap-2">
          <LocaleSelector />
          <CurrencySelector />
          <Link
            href="/booking"
            className="whitespace-nowrap rounded-full bg-primary px-5 py-2.5 text-[16px] font-bold text-foreground"
          >
            {t('bookNow')}
          </Link>
        </div>
      </div>
    </header>
  );
}
