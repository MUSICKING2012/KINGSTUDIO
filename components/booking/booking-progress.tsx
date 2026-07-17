import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

// 4-step booking progress bar, fixed to the top of the flow (PRD §5.3 "진행률 표시 바를 상단
// 고정"). Server component — pure presentation. Steps 3·4 (options / payment) are future stages
// and render as upcoming (muted, non-interactive). Accessible: current step marked with
// aria-current and a text label under each dot, not colour alone.
export type BookingStep = 1 | 2 | 3 | 4;

type ProgressLabels = {
  aria: string; // e.g. "Step 2 of 4" (already interpolated by the server page)
  step1: string;
  step2: string;
  step3: string;
  step4: string;
};

export function BookingProgress({
  current,
  labels,
}: {
  current: BookingStep;
  labels: ProgressLabels;
}) {
  const steps = [labels.step1, labels.step2, labels.step3, labels.step4];

  return (
    <nav
      aria-label={labels.aria}
      className="sticky top-0 z-30 -mx-margin-mobile border-b border-border bg-background/90 px-margin-mobile py-stack-md backdrop-blur md:-mx-margin-desktop md:px-margin-desktop"
    >
      <ol className="mx-auto flex max-w-container-max items-center gap-stack-sm">
        {steps.map((label, i) => {
          const step = (i + 1) as BookingStep;
          const state = step < current ? 'done' : step === current ? 'current' : 'upcoming';
          return (
            <li key={label} className="flex flex-1 items-center gap-stack-sm">
              <span
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 text-label-sm',
                  state === 'upcoming' ? 'text-muted-foreground' : 'text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                    state === 'done' && 'border-foreground bg-foreground text-background',
                    state === 'current' && 'border-foreground text-foreground',
                    state === 'upcoming' && 'border-border text-muted-foreground',
                  )}
                >
                  {state === 'done' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : step}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
              {step < 4 && (
                <span
                  aria-hidden="true"
                  className={cn('h-px flex-1', step < current ? 'bg-foreground' : 'bg-border')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
