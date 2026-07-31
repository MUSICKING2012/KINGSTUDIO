'use client';

import { useLocale } from 'next-intl';

import { LOCALE_LABEL } from '@/lib/currency/config';
import { Link, usePathname } from '@/lib/i18n/navigation';
import { locales } from '@/lib/i18n/routing';

/**
 * 푸터 언어 pill. 실측 소스 = `KING STUDIO Footer.dc.html` COL 3 `langs`.
 *
 * 헤더의 `<select>` LocaleSelector 와 병존한다(디자인이 푸터에도 스위처를 둔다). 셀렉터와 달리
 * **실제 `<a>` 링크**로 렌더해 크롤러가 5개 로케일 대체 URL을 따라갈 수 있게 한다(SEO, PRD §5.1).
 * 클라이언트 경계인 이유는 현재 pathname 이 필요해서다(`usePathname`).
 *
 * 라벨은 짧은 언어 태그(EN·KO·…)라 번역 대상이 아니다. 접근 이름은 자기표기
 * (`LOCALE_LABEL` — 한국어·日本語 …)를 `aria-label` 로 준다: "K O" 로 읽히는 것을 막는다.
 *
 * 현재 로케일 pill 은 accent 채움 + **잉크 라벨**(흰 라벨은 12px에서 3.63:1 로 AA 미달).
 * 활성 상태를 색만으로 전달하지 않도록 `aria-current="true"` 를 병기한다(CLAUDE §3.9).
 */
const PILL_LABEL: Record<string, string> = {
  ko: 'KO',
  en: 'EN',
  ja: 'JA',
  'zh-HK': 'ZH-HK',
  'zh-CN': 'ZH-CN',
};

export function FooterLocalePills() {
  const active = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-1.5">
      {locales.map((l) => {
        const isActive = l === active;
        return (
          <Link
            key={l}
            href={pathname}
            locale={l}
            hrefLang={l}
            aria-label={LOCALE_LABEL[l]}
            aria-current={isActive ? 'true' : undefined}
            className={
              isActive
                ? 'rounded-full border border-primary bg-primary px-[13px] py-[7px] text-[12px] font-bold text-foreground'
                : 'rounded-full border border-paper/25 px-[13px] py-[7px] text-[12px] font-bold text-paper hover:border-paper/50'
            }
          >
            {PILL_LABEL[l]}
          </Link>
        );
      })}
    </div>
  );
}
