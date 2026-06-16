// Global fallback for paths outside any locale segment. Must render its own <html>
// because it sits above the [locale] layout. The middleware redirects most traffic
// to a localized path, so this is rarely hit.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
          <p>404 — Page not found</p>
        </main>
      </body>
    </html>
  );
}
