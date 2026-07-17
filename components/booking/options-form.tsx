'use client';

import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { isMinorAtDate } from '@/lib/consent/minor';
import {
  type ConsentType,
  type GuardianInfo,
  requiredConsentTypes,
  validateStep3,
} from '@/lib/consent/step3';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

type SongOption = { id: string; title: string; artist: string };

// Mirrors messages booking.step3 (passed via t.raw). Loosely typed — the page owns the copy.
export type OptionsFormLabels = {
  missingSlot: string;
  backToSchedule: string;
  headcount: { label: string; hint: string };
  song: { label: string; placeholder: string; rentalNote: string };
  reservant: {
    title: string;
    name: string;
    email: string;
    phone: string;
    nationality: string;
    passportName: string;
    hint: string;
  };
  participants: { title: string; dobLabel: string; hint: string };
  guardian: {
    title: string;
    notice: string;
    name: string;
    relation: string;
    contact: string;
    email: string;
    consentLabel: string;
  };
  consent: {
    requiredTitle: string;
    optionalTitle: string;
    items: Record<string, string>;
    marketing: { note: string } & Record<string, string>;
  };
  errors: Record<string, string>;
  continueCta: string;
};

const STORAGE_KEY = 'kingstudio.booking';

type Draft = {
  package: string;
  date: string;
  startTime: string;
  endTime: string;
  options?: unknown;
};

const REQUIRED_ITEMS_BASE: ConsentType[] = ['tos', 'privacy', 'usage_scope'];
const RENTAL_ITEMS: ConsentType[] = ['korean_only', 'license_self_brought'];
const MARKETING_ITEMS: ConsentType[] = [
  'marketing_basic',
  'marketing_ads',
  'marketing_outdoor',
  'marketing_broadcast',
  'marketing_email',
  'marketing_sms',
];

function readDraft(): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function OptionsForm({
  packageSlug,
  isRental,
  headcountMin,
  headcountMax,
  songs,
  labels,
}: {
  packageSlug: string;
  isRental: boolean;
  headcountMin: number;
  headcountMax: number;
  songs: SongOption[];
  labels: OptionsFormLabels;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [headcount, setHeadcount] = useState(headcountMin);
  const [songId, setSongId] = useState('');
  const [reservant, setReservant] = useState({
    name: '',
    email: '',
    phone: '',
    nationality: '',
    passportName: '',
  });
  const [dobs, setDobs] = useState<string[]>(() => Array(headcountMin).fill(''));
  const [guardian, setGuardian] = useState<GuardianInfo>({
    name: '',
    relation: '',
    contact: '',
    email: '',
  });
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setDraft(readDraft());
    setHydrated(true);
  }, []);

  // Keep the DOB list length in sync with headcount (§5.7 전원 입력).
  useEffect(() => {
    setDobs((prev) => {
      const next = prev.slice(0, headcount);
      while (next.length < headcount) next.push('');
      return next;
    });
  }, [headcount]);

  const bookingDate = draft?.date ?? '';
  const hasMinor = useMemo(
    () => Boolean(bookingDate) && dobs.some((d) => d && isMinorAtDate(d, bookingDate)),
    [dobs, bookingDate],
  );

  const requiredConsents = requiredConsentTypes(isRental ? 'rental' : 'experience', hasMinor);

  const checkedList = useMemo(
    () => Object.keys(checked).filter((k) => checked[k]) as ConsentType[],
    [checked],
  );

  const validation = validateStep3({
    category: isRental ? 'rental' : 'experience',
    participantDobs: dobs,
    hasMinor,
    reservantName: reservant.name,
    reservantEmail: reservant.email,
    checkedConsents: checkedList,
    guardian: hasMinor ? guardian : null,
  });

  const draftReady = Boolean(draft && draft.package === packageSlug && draft.date);

  const toggle = (c: ConsentType) => setChecked((p) => ({ ...p, [c]: !p[c] }));

  const onContinue = () => {
    setSubmitted(true);
    if (!validation.ok || !draft) return;
    const next: Draft = {
      ...draft,
      options: {
        headcount,
        songId: isRental ? null : songId || null,
        reservant,
        participantDobs: dobs,
        hasMinor,
        guardian: hasMinor ? guardian : null,
        consents: checkedList,
      },
    };
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // non-fatal
    }
    router.push(`/booking/checkout?package=${encodeURIComponent(packageSlug)}`);
  };

  if (hydrated && !draftReady) {
    return (
      <div className="mt-stack-lg rounded-brand-card border border-border bg-card p-stack-lg">
        <p className="text-body-md text-foreground">{labels.missingSlot}</p>
        <Button
          className="mt-stack-md bg-foreground text-background hover:bg-foreground/90"
          onClick={() =>
            router.push(`/booking/schedule?package=${encodeURIComponent(packageSlug)}`)
          }
        >
          {labels.backToSchedule}
        </Button>
      </div>
    );
  }

  const showError = (code: string) => submitted && validation.errors.includes(code);

  return (
    <div className="mt-stack-lg max-w-2xl space-y-section-gap">
      {/* Headcount */}
      <section>
        <label htmlFor="headcount" className="block text-label-sm text-muted-foreground">
          {labels.headcount.label}
        </label>
        <select
          id="headcount"
          value={headcount}
          onChange={(e) => setHeadcount(Number(e.target.value))}
          className="mt-stack-sm w-32 rounded-md border border-input bg-card px-4 py-2 text-body-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {Array.from({ length: headcountMax - headcountMin + 1 }, (_, i) => headcountMin + i).map(
            (n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ),
          )}
        </select>
        <p className="mt-stack-sm text-label-sm text-muted-foreground">{labels.headcount.hint}</p>
      </section>

      {/* Song (experience only) */}
      <section>
        <label htmlFor="song" className="block text-label-sm text-muted-foreground">
          {labels.song.label}
        </label>
        {isRental ? (
          <p className="mt-stack-sm text-body-md text-muted-foreground">{labels.song.rentalNote}</p>
        ) : (
          <select
            id="song"
            value={songId}
            onChange={(e) => setSongId(e.target.value)}
            className="mt-stack-sm w-full rounded-md border border-input bg-card px-4 py-2 text-body-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">{labels.song.placeholder}</option>
            {songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s.artist}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Reservant info */}
      <section>
        <h2 className="font-display text-headline-lg text-foreground">{labels.reservant.title}</h2>
        <p className="mt-stack-sm text-label-sm text-muted-foreground">{labels.reservant.hint}</p>
        <div className="mt-stack-md grid grid-cols-1 gap-stack-md sm:grid-cols-2">
          <Field
            id="r-name"
            label={labels.reservant.name}
            value={reservant.name}
            onChange={(v) => setReservant((p) => ({ ...p, name: v }))}
          />
          <Field
            id="r-email"
            label={labels.reservant.email}
            type="email"
            value={reservant.email}
            onChange={(v) => setReservant((p) => ({ ...p, email: v }))}
          />
          <Field
            id="r-phone"
            label={labels.reservant.phone}
            value={reservant.phone}
            onChange={(v) => setReservant((p) => ({ ...p, phone: v }))}
          />
          <Field
            id="r-nat"
            label={labels.reservant.nationality}
            value={reservant.nationality}
            onChange={(v) => setReservant((p) => ({ ...p, nationality: v }))}
          />
          <Field
            id="r-passport"
            label={labels.reservant.passportName}
            value={reservant.passportName}
            onChange={(v) => setReservant((p) => ({ ...p, passportName: v }))}
          />
        </div>
        {showError('reservant_missing') && (
          <p className="mt-stack-sm text-label-sm text-destructive">
            {labels.errors.reservant_missing}
          </p>
        )}
      </section>

      {/* Participant DOBs */}
      <section>
        <h2 className="font-display text-headline-lg text-foreground">
          {labels.participants.title}
        </h2>
        <p className="mt-stack-sm text-label-sm text-muted-foreground">
          {labels.participants.hint}
        </p>
        <div className="mt-stack-md grid grid-cols-1 gap-stack-md sm:grid-cols-2">
          {dobs.map((d, i) => (
            <Field
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed positional participant slots
              key={i}
              id={`dob-${i}`}
              type="date"
              label={labels.participants.dobLabel.replace('{n}', String(i + 1))}
              value={d}
              onChange={(v) =>
                setDobs((prev) => {
                  const next = [...prev];
                  next[i] = v;
                  return next;
                })
              }
            />
          ))}
        </div>
        {showError('dob_missing') && (
          <p className="mt-stack-sm text-label-sm text-destructive">{labels.errors.dob_missing}</p>
        )}
      </section>

      {/* Guardian (conditional — any participant <16) */}
      {hasMinor && (
        <section className="rounded-brand-card border border-primary/40 bg-card p-stack-lg">
          <h2 className="font-display text-headline-lg text-foreground">{labels.guardian.title}</h2>
          <p className="mt-stack-sm text-body-md text-muted-foreground">{labels.guardian.notice}</p>
          <div className="mt-stack-md grid grid-cols-1 gap-stack-md sm:grid-cols-2">
            <Field
              id="g-name"
              label={labels.guardian.name}
              value={guardian.name}
              onChange={(v) => setGuardian((p) => ({ ...p, name: v }))}
            />
            <Field
              id="g-relation"
              label={labels.guardian.relation}
              value={guardian.relation}
              onChange={(v) => setGuardian((p) => ({ ...p, relation: v }))}
            />
            <Field
              id="g-contact"
              label={labels.guardian.contact}
              value={guardian.contact}
              onChange={(v) => setGuardian((p) => ({ ...p, contact: v }))}
            />
            <Field
              id="g-email"
              label={labels.guardian.email}
              type="email"
              value={guardian.email}
              onChange={(v) => setGuardian((p) => ({ ...p, email: v }))}
            />
          </div>
          <ConsentRow
            id="c-guardian"
            checked={!!checked.guardian}
            onToggle={() => toggle('guardian')}
            label={labels.guardian.consentLabel}
            required
          />
          {showError('guardian_incomplete') && (
            <p className="mt-stack-sm text-label-sm text-destructive">
              {labels.errors.guardian_incomplete}
            </p>
          )}
        </section>
      )}

      {/* Required consents */}
      <section>
        <h2 className="font-display text-headline-lg text-foreground">
          {labels.consent.requiredTitle}
        </h2>
        <div className="mt-stack-md space-y-stack-sm">
          {REQUIRED_ITEMS_BASE.map((c) => (
            <ConsentRow
              key={c}
              id={`c-${c}`}
              checked={!!checked[c]}
              onToggle={() => toggle(c)}
              label={labels.consent.items[c]}
              required
            />
          ))}
          {isRental &&
            RENTAL_ITEMS.map((c) => (
              <ConsentRow
                key={c}
                id={`c-${c}`}
                checked={!!checked[c]}
                onToggle={() => toggle(c)}
                label={labels.consent.items[c]}
                required
              />
            ))}
        </div>
        {submitted &&
          validation.missingConsents.filter((c) => requiredConsents.includes(c)).length > 0 && (
            <p className="mt-stack-sm text-label-sm text-destructive">
              {labels.errors.consent_missing}
            </p>
          )}
      </section>

      {/* Optional marketing consents */}
      <section>
        <h2 className="font-display text-headline-lg text-foreground">
          {labels.consent.optionalTitle}
        </h2>
        <p className="mt-stack-sm text-label-sm text-muted-foreground">
          {labels.consent.marketing.note}
        </p>
        <div className="mt-stack-md space-y-stack-sm">
          {MARKETING_ITEMS.map((c) => (
            <ConsentRow
              key={c}
              id={`c-${c}`}
              checked={!!checked[c]}
              onToggle={() => toggle(c)}
              label={labels.consent.marketing[c.replace('marketing_', '')]}
            />
          ))}
        </div>
      </section>

      <div className="flex justify-end border-t border-border pt-stack-lg">
        <Button
          type="button"
          onClick={onContinue}
          disabled={submitted && !validation.ok}
          className="bg-foreground text-background hover:bg-foreground/90"
        >
          {labels.continueCta}
        </Button>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-label-sm text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-stack-sm w-full rounded-md border border-input bg-card px-4 py-2 text-body-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    </div>
  );
}

function ConsentRow({
  id,
  checked,
  onToggle,
  label,
  required = false,
}: {
  id: string;
  checked: boolean;
  onToggle: () => void;
  label: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 h-4 w-4 shrink-0 accent-foreground"
      />
      <span className="text-body-md text-foreground">
        {required && <span className="mr-1 text-primary">*</span>}
        {label}
      </span>
    </label>
  );
}
