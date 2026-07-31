import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BolderSection } from '@/components/home/bolder-section';
import { BookingBarSection } from '@/components/home/booking-bar-section';
import { BoostSection } from '@/components/home/boost-section';
import { CategoriesSection } from '@/components/home/categories-section';
import { HeroSection } from '@/components/home/hero-section';
import { ProvideSection } from '@/components/home/provide-section';
import { TrustStrip } from '@/components/home/trust-strip';
import { Button } from '@/components/ui/button';
import { Link } from '@/lib/i18n/navigation';

// Editorial home (KING_STUDIO_DESIGN.md): light paper surface, ink display headline, accent as a
// spot color (section rule, NYT link, tier label). Static — no DB / live prices (prices live in DB
// per CLAUDE.md §6, shown on /packages). CTAs are ink buttons: shadcn's default variant is accent +
// white (fails AA at label size, §3.9), so primary CTAs override to bg-foreground/text-background.
// All copy lives in messages/*.json home.* (5 locales, key-consistent). NYT = real 2024 feature (§1).
//
// 디자인 개편 시퀀스 4 (docs/specs/Home_Slice_Spec.md) 진행 중 — 섹션을 슬라이스 단위로 교체한다.
//   4a (완료): Hero -> <HeroSection /> (스펙 §1)
//   4b (완료): NYT strip -> <TrustStrip />(§2) + <ProvideSection />(§3) + <BoostSection />(§7)
//              구 steps 섹션은 Provide 로 대체돼 제거(스펙 §9-8 — home.steps.* 5로케일 동시 삭제).
//   4c (완료): -> <CategoriesSection />(§4). 결정 ④ = A(4항목 매핑 + 비-ko /rental 비링크 게이팅).
//   4d (완료): 구 experience 섹션 -> <BolderSection />(§5, DB 배선). home.experience.* 5로케일 제거.
//   4e (완료): -> <BookingBarSection />(§6). 결정 ① = C(실 슬롯 배선) — §4 위험 구역.
// 아래 songs/finalCta 섹션과 그 i18n 키는 각 슬라이스가 자기 섹션을 교체할 때
// 5로케일 동시 제거한다(스펙 §9-8 / 결정 ⑥ — 슬라이스별 점진 이관). 지금 한꺼번에 지우면
// 4c~4e 사이 홈이 반쪽으로 남으므로 그러지 않는다.
//
// 섹션 순서는 디자인 원문 순서를 따르되, 미구현 구간은 기존 섹션이 자리를 지킨다:
//   Hero -> Trust strip -> Provide -> [구 experience/songs] -> Boost -> [구 finalCta] -> Footer
// (디자인상 Boost 는 Booking bar 뒤·Subscribe 앞이고, Subscribe 는 결정 ⑤ 로 취소됐다.)

// 결정 ⑦ = A(force-dynamic). 스펙은 4d 에서 전환 예정이었으나 4c 가 먼저 필요로 한다:
// §4-C 의 rental 로케일 게이트가 하드코딩 allow-list 를 금지하고 listPackages() DB read 를
// 요구하기 때문이다. 카탈로그·예약 라우트와 동일 패턴(category-catalog 호출 라우트,
// booking/page.tsx:25). 4d 의 패키지 카드가 같은 렌더 모드를 그대로 쓴다.
// ⚠ 홈이 정적 프리렌더 대상에서 빠지므로 Gate 3 Lighthouse 성능은 재측정 대상(§12-8).
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'home' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function HomePage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = useTranslations('home');

  return (
    <main>
      <HeroSection />

      <TrustStrip />

      <ProvideSection />

      <CategoriesSection locale={params.locale} />

      <BolderSection locale={params.locale} />

      {/* Songs teaser */}
      <section className="mx-auto max-w-container-max px-margin-mobile py-section-gap md:px-margin-desktop">
        <div className="flex flex-col gap-stack-md md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-headline-lg text-foreground">{t('songs.heading')}</h2>
            <p className="mt-stack-sm max-w-2xl text-body-md text-muted-foreground">
              {t('songs.sub')}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/songs">{t('songs.cta')}</Link>
          </Button>
        </div>
      </section>

      <BookingBarSection locale={params.locale} />

      <BoostSection />

      {/* Closing CTA — sparing ink band (DESIGN.md: ink used sparingly) */}
      <section className="border-t border-border bg-foreground text-background">
        <div className="mx-auto max-w-container-max px-margin-mobile py-section-gap text-center md:px-margin-desktop">
          <h2 className="font-display text-headline-xl">{t('finalCta.heading')}</h2>
          <p className="mt-stack-md text-body-lg text-background/80">{t('finalCta.sub')}</p>
          <div className="mt-stack-lg flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-background text-foreground hover:bg-background/90"
            >
              <Link href="/experience">{t('finalCta.cta')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
