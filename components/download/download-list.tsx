'use client';

import { useState } from 'react';

// Client half of the download page (Stage E1). Requests a short-lived signed URL from
// /api/download/file per item and navigates to it. The signed URL is used immediately and never
// stored; errors map to typed customer guidance (link gone / rate-limited / generic).

export type DownloadLabels = {
  version: string; // "v{version}"
  sizeMb: string; // "{size} MB"
  download: string;
  downloading: string;
  errorGone: string;
  errorRateLimited: string;
  errorGeneric: string;
  types: Record<string, string>; // DeliverableType → customer-facing label
};

export type DownloadItem = {
  id: string;
  type: string;
  version: number;
  sizeMb: number | null;
};

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));
}

export function DownloadList({
  token,
  items,
  labels,
}: {
  token: string;
  items: DownloadItem[];
  labels: DownloadLabels;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch('/api/download/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deliverableId: id }),
      });
      if (res.status === 429) {
        setError(labels.errorRateLimited);
        return;
      }
      if (res.status === 404 || res.status === 410) {
        setError(labels.errorGone);
        return;
      }
      if (!res.ok) {
        setError(labels.errorGeneric);
        return;
      }
      const data = (await res.json()) as { url?: string };
      if (!data.url) {
        setError(labels.errorGeneric);
        return;
      }
      // Immediate navigation — the signed URL expires in minutes and is never persisted.
      window.location.assign(data.url);
    } catch {
      setError(labels.errorGeneric);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-section-gap">
      {error ? (
        <p className="mb-stack-md text-body-md text-foreground" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-gutter md:grid-cols-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-brand-card bg-card p-6 shadow-sm"
          >
            <div>
              <p className="text-body-lg text-foreground">{labels.types[item.type] ?? item.type}</p>
              <p className="mt-1 text-label-sm text-muted-foreground">
                {fill(labels.version, { version: item.version })}
                {item.sizeMb !== null ? ` · ${fill(labels.sizeMb, { size: item.sizeMb })}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => download(item.id)}
              disabled={busyId !== null}
              className="rounded-full bg-foreground px-6 py-3 text-label-sm font-medium text-background disabled:opacity-50"
            >
              {busyId === item.id ? labels.downloading : labels.download}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
