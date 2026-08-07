import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';

import { EditorialImage } from '@/components/home/editorial-image';
import { computePackageTotal } from '@/lib/catalog/pricing';
import { listPackages } from '@/lib/catalog/queries';
import { LOCALE_DEFAULT_CURRENCY } from '@/lib/currency/config';
import { CURRENCY_COOKIE, parseCurrencyOverride } from '@/lib/currency/cookie';
import { formatApprox, formatKrw } from '@/lib/currency/format';
import { getExchangeRates } from '@/lib/exchange/cache';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { Link } from '@/lib/i18n/navigation';
import type { Locale } from '@/lib/i18n/routing';
import {
  listStudioEquipment,
  listStudioRoomProfiles,
  listTeamMembers,
  pyeongToSquareMeters,
} from '@/lib/studio/queries';

/**
 * STUDIOS 페이지 (시퀀스 5d-3 — 전 로케일 소개 페이지 전환, `Studio_Slice_Spec.md` §4).
 * 실측 소스 = `design/pages/Studio.dc.html`.
 *
 * 5d-2 대비 변경: ① notFound 게이트 제거 — 전 로케일 200(소개 콘텐츠는 언어 무관),
 * 대여 패키지 섹션만 rental 노출 로케일(현 ko) 조건부. ② 룸 스펙 2행·장비·팀 섹션 추가 —
 * 전부 DB(`studio_room_profiles`·`studio_equipment`·`team_members`, Aiden 제공 fill-in만.
 * 발명 금지: Size·Max guests 행, 장비 카테고리 분류, 팀 bio 는 데이터 미제공이라 없다).
 *
 * 디자인 대비 의도적 델타(5d-2 유지분 포함):
 *  - 대여 패널의 "온라인 예약 없이 문의로 진행"은 **이식 금지**(결정 ② — PRD §5.2 즉시결제).
 *  - 장비: 2026-08-07 오너 리스트(카테고리·모델·수량) 반영 — 카테고리 그룹 + 수량 ×N(≥2만).
 *    디자인 아코디언 대신 그룹 라벨 + 필 리스트(기존 패턴 유지).
 *  - 팀 카드 3:4 포트레이트 슬롯(2026-08-07 fill-in 2차) — 오너 제공분만 실사진, 나머지는
 *    공란 placeholder(오너 지시). bio 미제공 → 이름·역할까지만.
 *  - 이미지 7슬롯 = 실사진(2026-08-07 오너 제공 9장 — A 4·B 4·세션 현장 1 — 중 7슬롯 배치,
 *    `STUDIO_PHOTOS`). 스페어 2장(A/B 컨트롤룸 2앵글)은 원본 폴더 보존, 미커밋.
 *  - 소형 텍스트 알파 상향: 라이트 /70 (§11-W).
 *
 * 면적 표기: DB 는 평, 렌더는 `studios.rooms.area` 메시지({pyeong}·{sqm}) — ko "10평 (33㎡)",
 * 비-ko "33㎡" 계열. 환산은 결정적(1평=3.3058㎡, 정수 반올림).
 */
export const dynamic = 'force-dynamic';

/** 실사진 슬롯 매핑 (원본 = 오너 제공, `scripts/optimize-studio-images.ts` 산출물).
 *  배치 순서 = 오너 지정(2026-08-07 2차): 히어로 = 세션 현장 컷(인물 — 오너 제공 = 게시 승인),
 *  A = 컨트롤룸·부스·부스 2앵글 / B = 컨트롤룸·부스 2앵글·부스. 슬롯 키(main/booth/desk)는
 *  레이아웃 위치명일 뿐 사진 내용과 1:1 아님 — alt 는 실제 내용을 기술(messages). */
const STUDIO_PHOTOS = {
  hero: '/images/studios/studio-hero-session.jpg',
  rooms: {
    a: {
      main: '/images/studios/studio-a-control-room-1.jpg',
      booth: '/images/studios/studio-a-booth-1.jpg',
      desk: '/images/studios/studio-a-booth-2.jpg',
    },
    b: {
      main: '/images/studios/studio-b-control-room-1.jpg',
      booth: '/images/studios/studio-b-booth-2.jpg',
      desk: '/images/studios/studio-b-booth-1.jpg',
    },
  } as Record<string, { main: string; booth: string; desk: string }>,
};

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'studios' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default async function StudiosPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'studios' });
  const tp = await getTranslations({ locale, namespace: 'packages' });

  const prismaLocale = toPrismaLocale(locale as Locale);
  const [all, rooms, equipment, team, rates] = await Promise.all([
    listPackages({ locale: prismaLocale }),
    listStudioRoomProfiles(),
    listStudioEquipment(),
    listTeamMembers(),
    getExchangeRates().catch((e) => {
      console.error('[studios] exchange rate fetch failed, KRW-only fallback:', e);
      return null;
    }),
  ]);
  // 대여는 로케일 조건부 섹션이다(5d-3) — 0건이면 섹션 자체를 숨긴다(구 notFound 게이트 폐기).
  const rental = all.filter((p) => p.category === 'rental');

  const currency =
    parseCurrencyOverride(cookies().get(CURRENCY_COOKIE)?.value) ??
    LOCALE_DEFAULT_CURRENCY[locale as Locale];
  const approxFor = (amountKrw: number) =>
    rates ? formatApprox(amountKrw, currency, rates[currency], locale) : null;

  type PkgItem = { name: string; tagline: string };
  const items = tp.raw('items') as Record<string, PkgItem>;

  const area = (pyeong: number) => t('rooms.area', { pyeong, sqm: pyeongToSquareMeters(pyeong) });

  // displayOrder 순서를 유지한 카테고리 그룹핑(인접 동일 카테고리 병합 — 시드가 카테고리 연속 배치).
  const equipmentGroups: { category: string | null; items: typeof equipment }[] = [];
  for (const item of equipment) {
    const last = equipmentGroups[equipmentGroups.length - 1];
    if (last && last.category === item.category) last.items.push(item);
    else equipmentGroups.push({ category: item.category, items: [item] });
  }

  return (
    <main>
      {/* Hero — 메타 스트립은 디자인 /40 대신 /70 (§11-W) */}
      <section className="mx-auto max-w-container-max px-gutter pt-10">
        <div className="flex flex-wrap justify-between gap-1.5 pb-5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/70">
          <span>{t('hero.meta.a')}</span>
          <span>{t('hero.meta.b')}</span>
          <span>{t('hero.meta.c')}</span>
          <span>{t('hero.meta.d')}</span>
        </div>
        <h1 className="ks-display text-[clamp(46px,9vw,110px)] leading-[0.9] tracking-[-0.01em] text-foreground">
          {t('hero.title1')}
          <br />
          {t('hero.title2')}
        </h1>
        <p className="mt-[26px] max-w-[560px] text-[15px] leading-[1.7] text-foreground/70">
          {t('hero.sub')}
        </p>
        <div className="mt-[30px] aspect-[21/9] overflow-hidden rounded-ks-bar">
          <EditorialImage
            alt={t('hero.imageAlt')}
            src={STUDIO_PHOTOS.hero}
            sizes="(min-width: 1280px) 1232px, 100vw"
            priority
            className="h-full"
          />
        </div>
      </section>

      {/* Rooms — 스펙은 DB fill-in 이 있는 행만(§4-A: Size·Max guests 미제공 = 미표기) */}
      <section className="mx-auto flex max-w-container-max flex-col gap-6 px-gutter pt-14">
        {rooms.map((room, i) => (
          <div
            key={room.slug}
            className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 rounded-ks-bar bg-paper-raise p-5"
          >
            <div className={`flex flex-col gap-3 ${i % 2 === 1 ? 'md:order-2' : ''}`}>
              <div className="aspect-[4/3] overflow-hidden rounded-ks-img">
                <EditorialImage
                  alt={t(`rooms.${room.slug}.mainAlt`)}
                  src={STUDIO_PHOTOS.rooms[room.slug]?.main}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="h-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-[4/3] overflow-hidden rounded-ks-img">
                  <EditorialImage
                    alt={t(`rooms.${room.slug}.boothAlt`)}
                    src={STUDIO_PHOTOS.rooms[room.slug]?.booth}
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="h-full"
                  />
                </div>
                <div className="aspect-[4/3] overflow-hidden rounded-ks-img">
                  <EditorialImage
                    alt={t(`rooms.${room.slug}.deskAlt`)}
                    src={STUDIO_PHOTOS.rooms[room.slug]?.desk}
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="h-full"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center gap-3.5 px-1.5 py-2.5">
              <span className="ks-display text-[clamp(30px,4vw,48px)] leading-none">
                {t(`rooms.${room.slug}.name`)}
              </span>
              <p className="m-0 text-[14px] leading-[1.65] text-foreground/70">
                {t(`rooms.${room.slug}.purpose`)}
              </p>
              <dl className="m-0 text-[13px]">
                {room.controlRoomPyeong !== null && (
                  <div className="flex justify-between gap-4 border-t border-foreground/10 py-2.5">
                    <dt className="font-bold uppercase tracking-[0.06em] text-foreground/70">
                      {t('rooms.specs.controlRoom')}
                    </dt>
                    <dd className="m-0 font-extrabold text-foreground">
                      {area(room.controlRoomPyeong)}
                    </dd>
                  </div>
                )}
                {room.boothPyeong !== null && (
                  <div className="flex justify-between gap-4 border-t border-foreground/10 py-2.5">
                    <dt className="font-bold uppercase tracking-[0.06em] text-foreground/70">
                      {t('rooms.specs.booth')}
                    </dt>
                    <dd className="m-0 font-extrabold text-foreground">{area(room.boothPyeong)}</dd>
                  </div>
                )}
              </dl>
              {room.allPackages && (
                <span className="self-start rounded-full border border-foreground/25 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.06em] text-foreground/70">
                  {t('rooms.allPackagesTag')}
                </span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Equipment — 카테고리 그룹 리스트(2026-08-07 오너 리스트가 분류·수량 포함 — 구 무분류 델타 해소).
          카테고리 라벨은 messages(`studios.equipment.categories.*`), 모델명·수량은 DB(언어 중립).
          수량은 2 이상만 ×N 병기(1대는 표기 생략 — 표기 방식이지 데이터 발명 아님). */}
      {equipment.length > 0 && (
        <section className="mx-auto max-w-container-max px-gutter pt-14">
          <h2 className="ks-display mb-1 text-[clamp(28px,4vw,44px)] leading-none text-foreground">
            {t('equipment.heading')}
          </h2>
          <p className="m-0 mb-5 text-[14px] text-foreground/70">{t('equipment.sub')}</p>
          {/* 룸 스펙 dl 과 동일한 에디토리얼 행 패턴 — 카테고리 레일(고정폭) + 아이템, 행 구분선 */}
          <div className="border-t border-foreground/10">
            {equipmentGroups.map((group) => (
              <div
                key={group.category ?? 'uncategorized'}
                className="grid gap-2.5 border-b border-foreground/10 py-4 md:grid-cols-[220px_1fr] md:gap-4"
              >
                {group.category && (
                  <h3 className="m-0 pt-2 text-[10.5px] font-bold uppercase tracking-[0.08em] text-foreground/70">
                    {t.has(`equipment.categories.${group.category}`)
                      ? t(`equipment.categories.${group.category}`)
                      : group.category}
                  </h3>
                )}
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                  {group.items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-full bg-paper-raise px-3.5 py-2 text-[13px] font-bold text-foreground"
                    >
                      {item.name}
                      {item.quantity != null && item.quantity > 1 ? ` ×${item.quantity}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Team — 오너 지정 순서(프로듀서 → 보컬 디렉터 → 매니저). 세로 포트레이트는 제공분만
          (제공 = 게시 동의 — §4-A), 미제공 인원은 공란(placeholder 박스 — 오너 지시 2026-08-07).
          bio 는 여전히 미제공 → 이름·역할까지만. */}
      {team.length > 0 && (
        <section className="mx-auto max-w-container-max px-gutter pt-14">
          <h2 className="ks-display mb-5 text-[clamp(28px,4vw,44px)] leading-none text-foreground">
            {t('team.heading')}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[18px]">
            {team.map((member) => (
              <article
                key={member.id}
                className="flex flex-col gap-1 overflow-hidden rounded-ks-bar bg-paper-raise"
              >
                <EditorialImage
                  alt={member.name}
                  src={member.photoPath ?? undefined}
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="aspect-[3/4]"
                />
                <div className="flex flex-col gap-1 p-6 pt-4">
                  <span className="ks-display text-[24px] leading-tight">{member.name}</span>
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.06em] text-foreground/70">
                    {t(`team.roles.${member.roleKey}`)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* 대여 패키지 — rental 노출 로케일(현 ko)만. DB 정본, "문의제" 카피 이식 금지(결정 ②) */}
      {rental.length > 0 && (
        <section className="mx-auto max-w-container-max px-gutter pt-14">
          <h2 className="ks-display mb-1 text-[clamp(28px,4vw,44px)] leading-none text-foreground">
            {tp('catalog.categories.rental.heading')}
          </h2>
          <p className="m-0 mb-5 text-[14px] text-foreground/70">
            {tp('catalog.categories.rental.subtitle')}
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[18px]">
            {rental.map((pkg) => {
              const baseKrw = computePackageTotal(pkg, pkg.headcountMin).totalKrw;
              const approx = approxFor(baseKrw);
              const item = items[pkg.slug];
              return (
                <article
                  key={pkg.id}
                  className="flex flex-col gap-3 rounded-ks-bar bg-paper-raise p-6"
                >
                  <div>
                    <span className="ks-display text-[26px]">{item?.name ?? pkg.name}</span>
                    {item?.tagline && (
                      <span className="mt-0.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-foreground/70">
                        {item.tagline}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[27px] font-extrabold leading-tight text-foreground">
                      {formatKrw(baseKrw)}
                    </span>
                    <span className="text-[12px] font-bold text-foreground/70">
                      · {tp('catalog.durationLabel', { minutes: pkg.slotMinutes })} ·{' '}
                      {tp('catalog.headcountLabel', {
                        min: pkg.headcountMin,
                        max: pkg.headcountMax,
                      })}
                    </span>
                  </div>
                  {approx && (
                    <span className="-mt-1.5 text-[11.5px] text-foreground/70">{approx}</span>
                  )}
                  <Link
                    href={`/packages/${pkg.slug}`}
                    className="mt-auto rounded-ks-field bg-foreground p-3 text-center text-[14px] font-extrabold text-background"
                  >
                    {tp('catalog.viewDetail')} →
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA — 대형 헤드라인만 흰색(≥34px w800 = AA-large 통과, 5a 패턴 재사용) */}
      <section className="mx-auto max-w-container-max px-gutter pb-16 pt-14">
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-[24px] bg-primary p-[clamp(30px,5vw,60px)]">
          <h2 className="ks-display text-[clamp(34px,6vw,72px)] leading-[0.94] text-white">
            {t('cta.title1')}
            <br />
            {t('cta.title2')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/product"
              className="rounded-full bg-white px-[26px] py-[15px] text-[15px] font-extrabold text-foreground"
            >
              {t('cta.packages')} →
            </Link>
            <Link
              href="/product#bookbar"
              className="rounded-full bg-foreground px-[26px] py-[15px] text-[15px] font-extrabold text-background"
            >
              {t('cta.book')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
