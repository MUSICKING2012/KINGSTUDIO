import type { ReactNode } from 'react';

// Pass-through root layout. The real <html>/<body> is rendered by app/[locale]/layout.tsx;
// this file exists only because a top-level not-found.tsx requires a root layout (next-intl
// localized-routing pattern). It must NOT render <html>/<body> to avoid nesting.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
