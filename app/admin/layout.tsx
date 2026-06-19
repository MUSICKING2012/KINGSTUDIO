import '@/app/globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = { title: 'KING STUDIO Admin' };

// Admin shell — non-localized (CLAUDE §2). Renders its own <html>/<body> because the root
// app/layout.tsx is a pass-through (the localized html/body lives under app/[locale]).
export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
