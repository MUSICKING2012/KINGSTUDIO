import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// ─── Dual-surface mechanism (stitch "Alternating Section") ────────────────────
// stitch alternates a dark cinematic base (brand storytelling) with a Warm Bone
// light base (functional/transactional). This is per-SECTION, NOT a global theme
// toggle — and NOT shadcn's `.dark` class: our brand tokens are fixed hex (B
// namespace), not CSS-var driven, so `.dark` would not affect them. Each section
// explicitly declares its tone; children inherit the matching foreground token.
//
// Contrast (measured, step 3):
//   cinematic #181214 — body text on-surface #ecdfe2 = 14.28:1 ✓.
//     primary-as-text must use `text-brand-primary-on-dark` (#ffb4a9, 10.88:1);
//     #e83528 on dark = 4.38:1 (fails AA normal — fills/large type only).
//   warm #FBF9F7 — body text #181214 = 17.61:1 ✓. #e83528 used for fills + large
//     type (white label on #e83528 = 4.22:1 → large/bold only).
//
// Usage:
//   <Surface tone="cinematic">…dark hero / storytelling…</Surface>
//   <Surface tone="warm">…booking / catalog / forms…</Surface>

export type SurfaceTone = 'cinematic' | 'warm';

const toneClasses: Record<SurfaceTone, string> = {
  cinematic: 'bg-surface-cinematic text-on-surface',
  warm: 'bg-surface-warm text-surface-cinematic',
};

export function Surface({
  tone,
  className,
  children,
  ...props
}: { tone: SurfaceTone } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section data-tone={tone} className={cn(toneClasses[tone], className)} {...props}>
      {children}
    </section>
  );
}
