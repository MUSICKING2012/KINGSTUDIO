'use client';

import type { PricingMode } from '@prisma/client';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { resolveDiscounts } from '@/lib/catalog/discount';
import { computePackageTotal } from '@/lib/catalog/pricing';
import type { ConsentType, GuardianInfo } from '@/lib/consent/step3';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

// Copy contract — mirrors messages booking.step4 (passed via t.raw). Loosely typed; page owns copy.
export type CheckoutLabels = {
  back: string;
  title: string;
  subtitle: string;
  missingDraft: string;
  backToDetails: string;
  summary: {
    title: string;
    package: string;
    dateTime: string;
    headcount: string;
    subtotal: string;
    discount: string;
    total: string;
    cdNote: string;
  };
  currencyNotice: string;
  pg: { title: string; inicis: string; paypal: string; feeInicis: string; feePaypal: string };
  consent: { title: string; payment: string };
  payCta: string;
  processing: string;
  errors: Record<string, string>;
  success: { title: string; refLabel: string; message: string };
};

const STORAGE_KEY = 'kingstudio.booking';

type Reservant = {
  name: string;
  email: string;
  phone: string;
  nationality: string;
  passportName: string;
};

type DraftOptions = {
  headcount: number;
  songId: string | null;
  reservant: Reservant;
  participantDobs: string[];
  hasMinor: boolean;
  guardian: GuardianInfo | null;
  consents: ConsentType[];
};

type Draft = {
  package: string;
  date: string;
  startTime: string;
  endTime: string;
  options?: DraftOptions;
};

function readDraft(): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function krw(n: number): string {
  return `₩${n.toLocaleString('en-US')}`;
}

export function CheckoutForm({
  packageSlug,
  packageName,
  pricing,
  cdIncluded,
  returningEligible,
  defaultPg,
  locale,
  labels,
}: {
  packageSlug: string;
  packageName: string;
  pricing: {
    basePriceKrw: number;
    pricingMode: PricingMode;
    headcountMin: number;
    headcountMax: number;
  };
  cdIncluded: boolean;
  returningEligible: boolean;
  defaultPg: 'inicis' | 'paypal';
  locale: string;
  labels: CheckoutLabels;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pg, setPg] = useState<'inicis' | 'paypal'>(defaultPg);
  const [paymentConsent, setPaymentConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ bookingId: string; totalKrw: number } | null>(null);

  useEffect(() => {
    setDraft(readDraft());
    setHydrated(true);
  }, []);

  const options = draft?.options;
  const draftReady = Boolean(draft && draft.package === packageSlug && draft.date && options);

  // KRW-only price preview. Subtotal from the pure pricing calculator; discount preview from the pure
  // resolver using the SERVER-resolved returningEligible flag. The route recomputes authoritatively.
  const preview = useMemo(() => {
    if (!options) return null;
    try {
      const sub = computePackageTotal(pricing, options.headcount);
      const disc = resolveDiscounts({ subtotalKrw: sub.totalKrw, returningEligible });
      return { subtotalKrw: sub.totalKrw, discount: disc.applied, totalKrw: disc.totalKrw };
    } catch {
      return null;
    }
  }, [options, pricing, returningEligible]);

  if (hydrated && (!draftReady || !preview)) {
    return (
      <div className="mt-stack-lg rounded-brand-card border border-border bg-card p-stack-lg">
        <p className="text-body-md text-foreground">{labels.missingDraft}</p>
        <Button
          className="mt-stack-md bg-foreground text-background hover:bg-foreground/90"
          onClick={() => router.push(`/booking/options?package=${encodeURIComponent(packageSlug)}`)}
        >
          {labels.backToDetails}
        </Button>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="mt-stack-lg max-w-2xl rounded-brand-card border border-border bg-card p-stack-lg">
        <h2 className="font-display text-headline-lg text-foreground">{labels.success.title}</h2>
        <p className="mt-stack-md text-body-md text-muted-foreground">{labels.success.message}</p>
        <p className="mt-stack-md text-body-md text-foreground">
          {labels.success.refLabel}: <span className="font-mono">{confirmed.bookingId}</span>
        </p>
        <p className="mt-stack-sm text-headline-md text-foreground">{krw(confirmed.totalKrw)}</p>
      </div>
    );
  }

  if (!hydrated || !draft || !options || !preview) {
    return <div className="mt-stack-lg h-40" aria-hidden />;
  }

  const onPay = async () => {
    if (!paymentConsent || submitting) return;
    setSubmitting(true);
    setErrorCode(null);

    // Step 3 consents + the Step 4 payment consent (dedup).
    const consents = Array.from(new Set<ConsentType>([...options.consents, 'payment']));

    try {
      const res = await fetch('/api/booking/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          package: draft.package,
          date: draft.date,
          startTime: draft.startTime,
          headcount: options.headcount,
          songId: options.songId,
          reservant: options.reservant,
          participantDobs: options.participantDobs,
          guardian: options.guardian,
          consents,
          pg,
          locale,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        bookingId?: string;
        totalKrw?: number;
        error?: string;
      };
      if (res.ok && data.ok && data.bookingId) {
        try {
          window.sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // non-fatal
        }
        setConfirmed({ bookingId: data.bookingId, totalKrw: data.totalKrw ?? preview.totalKrw });
        return;
      }
      setErrorCode(data.error ?? 'internal_error');
    } catch {
      setErrorCode('internal_error');
    } finally {
      setSubmitting(false);
    }
  };

  const startEnd = `${draft.date} · ${draft.startTime.slice(0, 5)}–${draft.endTime.slice(0, 5)}`;

  return (
    <div className="mt-stack-lg max-w-2xl space-y-section-gap">
      {/* Summary — KRW only (§5.5 결제 직전 화면 KRW 단독) */}
      <section className="rounded-brand-card border border-border bg-card p-stack-lg">
        <h2 className="font-display text-headline-lg text-foreground">{labels.summary.title}</h2>
        <dl className="mt-stack-md space-y-stack-sm text-body-md">
          <Row label={labels.summary.package} value={packageName} />
          <Row label={labels.summary.dateTime} value={startEnd} />
          <Row label={labels.summary.headcount} value={String(options.headcount)} />
          <Row label={labels.summary.subtotal} value={krw(preview.subtotalKrw)} />
          {preview.discount && (
            <Row label={labels.summary.discount} value={`− ${krw(preview.discount.amountKrw)}`} />
          )}
          <div className="flex items-baseline justify-between border-t border-border pt-stack-sm">
            <dt className="text-label-md text-foreground">{labels.summary.total}</dt>
            <dd className="text-headline-md text-foreground">{krw(preview.totalKrw)}</dd>
          </div>
        </dl>
        {cdIncluded && (
          <p className="mt-stack-md text-label-sm text-muted-foreground">{labels.summary.cdNote}</p>
        )}
      </section>

      {/* KRW billing notice (§5.5 카드사 환율·PG 수수료 고지) */}
      <p className="text-label-sm text-muted-foreground">{labels.currencyNotice}</p>

      {/* PG choice */}
      <section>
        <h2 className="font-display text-headline-lg text-foreground">{labels.pg.title}</h2>
        <div className="mt-stack-md grid grid-cols-1 gap-stack-sm sm:grid-cols-2">
          <PgOption
            id="pg-inicis"
            selected={pg === 'inicis'}
            onSelect={() => setPg('inicis')}
            title={labels.pg.inicis}
            fee={labels.pg.feeInicis}
          />
          <PgOption
            id="pg-paypal"
            selected={pg === 'paypal'}
            onSelect={() => setPg('paypal')}
            title={labels.pg.paypal}
            fee={labels.pg.feePaypal}
          />
        </div>
      </section>

      {/* Required pre-payment consent (결제약관·환불규정) */}
      <section>
        <h2 className="font-display text-headline-lg text-foreground">{labels.consent.title}</h2>
        <label htmlFor="c-payment" className="mt-stack-md flex cursor-pointer items-start gap-3">
          <input
            id="c-payment"
            type="checkbox"
            checked={paymentConsent}
            onChange={() => setPaymentConsent((v) => !v)}
            className="mt-1 h-4 w-4 shrink-0 accent-foreground"
          />
          <span className="text-body-md text-foreground">
            <span className="mr-1 text-primary">*</span>
            {labels.consent.payment}
          </span>
        </label>
      </section>

      {errorCode && (
        <p className="text-label-sm text-destructive">
          {labels.errors[errorCode] ?? labels.errors.internal_error}
        </p>
      )}

      <div className="flex justify-end border-t border-border pt-stack-lg">
        <Button
          type="button"
          onClick={onPay}
          disabled={!paymentConsent || submitting}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          {submitting ? labels.processing : `${labels.payCta} · ${krw(preview.totalKrw)}`}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function PgOption({
  id,
  selected,
  onSelect,
  title,
  fee,
}: {
  id: string;
  selected: boolean;
  onSelect: () => void;
  title: string;
  fee: string;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'rounded-md border p-stack-md text-left transition-colors',
        selected ? 'border-foreground bg-foreground/5' : 'border-input hover:border-foreground/40',
      )}
    >
      <span className="block text-body-md text-foreground">{title}</span>
      <span className="mt-stack-sm block text-label-sm text-muted-foreground">{fee}</span>
    </button>
  );
}
