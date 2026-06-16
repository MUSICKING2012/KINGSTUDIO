import { notFound } from 'next/navigation';

// Catch unmatched paths under a valid locale and render the localized 404.
export default function CatchAllPage() {
  notFound();
}
