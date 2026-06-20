import { BadgeCheck, Sparkles } from 'lucide-react';

// Presentational song card (no client JS, no detail link — display only this slice). Display name
// is already fallback-resolved by listSongs (§5.4). Uses foundation tokens on the warm surface.
// §7.2: brand-primary (#e83528) appears only as a decorative border/icon — never as small body
// text (fails AA at this size). Card text uses high-contrast tokens. §3.9: every badge pairs
// color with text + an icon, so meaning is never carried by color alone.
//
// §5.7: the card takes only resolved license-badge LABELS, never the raw per-type verified flags.
// When the display gate is OFF (MVP default) the page passes `licenseBadges: []`, so no license
// data reaches the client at all — not even in the RSC payload.

export function SongCard({
  title,
  artist,
  beginnerCuration,
  beginnerLabel,
  licenseBadges,
}: {
  title: string;
  artist: string;
  beginnerCuration: boolean;
  beginnerLabel: string;
  licenseBadges: string[];
}) {
  return (
    <li className="flex flex-col gap-stack-md rounded-brand-card bg-white p-stack-lg shadow-[0_10px_30px_rgba(26,20,22,0.05)]">
      <div className="flex flex-col gap-stack-sm">
        <h3 className="font-headline text-2xl leading-tight text-surface-cinematic">{title}</h3>
        <p className="font-sans text-body-md text-muted-text">{artist}</p>
      </div>

      {(beginnerCuration || licenseBadges.length > 0) && (
        <div className="flex flex-wrap gap-stack-sm">
          {beginnerCuration && (
            <span className="inline-flex items-center gap-stack-sm rounded-full border border-brand-primary px-3 py-1 font-label-sm text-label-sm uppercase tracking-widest text-surface-cinematic">
              <Sparkles className="size-3.5 text-brand-primary" aria-hidden="true" />
              {beginnerLabel}
            </span>
          )}
          {licenseBadges.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-stack-sm rounded-full border border-success/40 px-3 py-1 font-label-sm text-label-sm uppercase tracking-widest text-surface-cinematic"
            >
              <BadgeCheck className="size-3.5 text-success" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
