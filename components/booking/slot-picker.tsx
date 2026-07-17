'use client';

import { Check, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/lib/i18n/navigation';
import { cn } from '@/lib/utils';

type SlotStatus = { startTime: string; endTime: string; available: boolean };

type PickerLabels = {
  dateLabel: string;
  windowHint: string;
  pickDatePrompt: string;
  loading: string;
  loadError: string;
  retry: string;
  noSlots: string;
  available: string;
  soldOut: string;
  timezoneNote: string;
  selectedLabel: string;
  continueCta: string;
};

const STORAGE_KEY = 'kingstudio.booking';

type BookingDraft = {
  package: string;
  date: string;
  startTime: string;
  endTime: string;
};

// "HH:MM:00" → "HH:MM"
function hhmm(t: string): string {
  return t.slice(0, 5);
}

function readDraft(): BookingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookingDraft) : null;
  } catch {
    return null;
  }
}

function writeDraft(draft: BookingDraft): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // sessionStorage unavailable (private mode / quota) — non-fatal, state stays in memory.
  }
}

type Phase = 'idle' | 'loading' | 'loaded' | 'error';

export function SlotPicker({
  packageSlug,
  locale,
  minDate,
  maxDate,
  labels,
}: {
  packageSlug: string;
  locale: string;
  minDate: string;
  maxDate: string;
  labels: PickerLabels;
}) {
  const router = useRouter();
  const [date, setDate] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [slots, setSlots] = useState<SlotStatus[]>([]);
  const [selected, setSelected] = useState<{ startTime: string; endTime: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Rehydrate a prior selection (§5.3 sessionStorage temp-save) if it matches this package.
  useEffect(() => {
    const draft = readDraft();
    if (draft && draft.package === packageSlug && draft.date >= minDate && draft.date <= maxDate) {
      setDate(draft.date);
      setSelected({ startTime: draft.startTime, endTime: draft.endTime });
    }
  }, [packageSlug, minDate, maxDate]);

  const loadSlots = useCallback(
    async (d: string) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setPhase('loading');
      try {
        const res = await fetch(
          `/api/availability?package=${encodeURIComponent(packageSlug)}&date=${d}&locale=${locale}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error(`availability ${res.status}`);
        const data = (await res.json()) as { slots: SlotStatus[] };
        setSlots(data.slots ?? []);
        setPhase('loaded');
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setPhase('error');
      }
    },
    [packageSlug, locale],
  );

  // Fetch whenever a valid in-window date is set.
  useEffect(() => {
    if (date && date >= minDate && date <= maxDate) {
      loadSlots(date);
    }
  }, [date, minDate, maxDate, loadSlots]);

  const onPickDate = (value: string) => {
    setDate(value);
    setSelected(null);
  };

  const onSelectSlot = (slot: SlotStatus) => {
    if (!slot.available) return;
    const next = { startTime: slot.startTime, endTime: slot.endTime };
    setSelected(next);
    writeDraft({ package: packageSlug, date, ...next });
  };

  const onContinue = () => {
    if (!selected) return;
    writeDraft({ package: packageSlug, date, ...selected });
    // Step 3 (options) lands in Stage C — this is its final target URL.
    router.push(
      `/booking/options?package=${encodeURIComponent(packageSlug)}&date=${date}&time=${selected.startTime}`,
    );
  };

  return (
    <div className="mt-stack-lg">
      {/* Date field */}
      <div className="max-w-sm">
        <label htmlFor="booking-date" className="block text-label-sm text-muted-foreground">
          {labels.dateLabel}
        </label>
        <input
          id="booking-date"
          type="date"
          value={date}
          min={minDate}
          max={maxDate}
          onChange={(e) => onPickDate(e.target.value)}
          className="mt-stack-sm w-full rounded-md border border-input bg-card px-4 py-2 text-body-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <p className="mt-stack-sm text-label-sm text-muted-foreground">{labels.windowHint}</p>
      </div>

      {/* Timezone note (always visible so KST is unambiguous) */}
      <p className="mt-stack-md text-label-sm text-muted-foreground">{labels.timezoneNote}</p>

      {/* Slot region */}
      <div className="mt-stack-md min-h-24" aria-live="polite">
        {phase === 'idle' && !date && (
          <p className="text-body-md text-muted-foreground">{labels.pickDatePrompt}</p>
        )}

        {phase === 'loading' && (
          <p className="flex items-center gap-2 text-body-md text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {labels.loading}
          </p>
        )}

        {phase === 'error' && (
          <div className="flex items-center gap-stack-md">
            <p className="text-body-md text-destructive">{labels.loadError}</p>
            <Button variant="outline" size="sm" onClick={() => date && loadSlots(date)}>
              {labels.retry}
            </Button>
          </div>
        )}

        {phase === 'loaded' && slots.length === 0 && (
          <p className="text-body-md text-muted-foreground">{labels.noSlots}</p>
        )}

        {phase === 'loaded' && slots.length > 0 && (
          <ul className="grid grid-cols-2 gap-stack-sm sm:grid-cols-3">
            {slots.map((slot) => {
              const isSelected = selected?.startTime === slot.startTime;
              return (
                <li key={slot.startTime}>
                  <button
                    type="button"
                    disabled={!slot.available}
                    aria-pressed={isSelected}
                    onClick={() => onSelectSlot(slot)}
                    className={cn(
                      'flex w-full flex-col items-start gap-1 rounded-md border p-3 text-left transition-colors',
                      slot.available &&
                        !isSelected &&
                        'border-border bg-card hover:border-foreground',
                      isSelected && 'border-foreground bg-foreground text-background',
                      !slot.available &&
                        'cursor-not-allowed border-border bg-muted text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'text-body-md font-semibold',
                        !slot.available && 'line-through',
                      )}
                    >
                      {hhmm(slot.startTime)}–{hhmm(slot.endTime)}
                    </span>
                    <span className="flex items-center gap-1 text-label-sm">
                      {slot.available ? (
                        <>
                          <Check
                            className={cn('h-3.5 w-3.5', !isSelected && 'text-success')}
                            aria-hidden="true"
                          />
                          {labels.available}
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                          {labels.soldOut}
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Selected summary + continue (ink CTA — §3.9) */}
      {selected && (
        <div className="mt-stack-lg flex flex-wrap items-center justify-between gap-stack-md border-t border-border pt-stack-md">
          <p className="text-body-md text-foreground">
            <span className="text-muted-foreground">{labels.selectedLabel}: </span>
            {date} · {hhmm(selected.startTime)}–{hhmm(selected.endTime)} KST
          </p>
          <Button
            type="button"
            onClick={onContinue}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            {labels.continueCta}
          </Button>
        </div>
      )}
    </div>
  );
}
