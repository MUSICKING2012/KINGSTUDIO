import { NextResponse } from 'next/server';

import { isPackageViewable } from '@/lib/catalog/package-visibility';
import { getPackageBySlug } from '@/lib/catalog/queries';
import { prisma } from '@/lib/db/prisma';
import { toPrismaLocale } from '@/lib/i18n/locale';
import { type Locale, locales } from '@/lib/i18n/routing';
import { getAvailability } from '@/lib/slots/availability';
import {
  type PublicSlot,
  resolvePackageTier,
  tierFullGrid,
  unionTierSlots,
} from '@/lib/slots/publicAvailability';
import { InvalidDateInputError } from '@/lib/slots/time';
import { bookingWindow, isWithinBookingWindow } from '@/lib/slots/window';

// Public availability API (Stage B) — read-only. Thin wrapper over getAvailability that resolves
// the package tier, unions open slots across all ACTIVE rooms (rooms.is_active), and returns the
// full tier grid annotated with `available`. No room id is chosen or exposed (auto-assignment =
// Stage D). No payment, no slot lock, no writes.
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type SlotStatus = PublicSlot & { available: boolean };

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const packageSlug = searchParams.get('package');
  const date = searchParams.get('date');
  const localeParam = searchParams.get('locale');

  if (!packageSlug || !date || !localeParam) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 });
  }
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  }
  if (!locales.includes(localeParam as Locale)) {
    return NextResponse.json({ error: 'invalid_locale' }, { status: 400 });
  }
  if (!isWithinBookingWindow(date)) {
    const { minDate, maxDate } = bookingWindow();
    return NextResponse.json({ error: 'out_of_window', minDate, maxDate }, { status: 400 });
  }

  const prismaLocale = toPrismaLocale(localeParam as Locale);
  const pkg = await getPackageBySlug(packageSlug);

  // Locale exposure gate (C11) — ko-only rental/group must not be bookable from /en, /ja, etc.
  if (!isPackageViewable(pkg, prismaLocale)) {
    return NextResponse.json({ error: 'package_not_available' }, { status: 404 });
  }

  const tier = resolvePackageTier(pkg.name);
  if (!tier) {
    // Group / b2b packages have no self-serve slot grid (§5.3 constants).
    return NextResponse.json({ error: 'not_slot_bookable' }, { status: 400 });
  }

  try {
    const rooms = await prisma.room.findMany({ where: { isActive: true }, select: { id: true } });
    const perRoom = rooms.length
      ? await Promise.all(rooms.map((r) => getAvailability(r.id, date)))
      : [];
    const availableStarts = new Set(unionTierSlots(perRoom, tier).map((s) => s.startTime));
    const slots: SlotStatus[] = tierFullGrid(tier).map((g) => ({
      ...g,
      available: availableStarts.has(g.startTime),
    }));

    return NextResponse.json({
      date,
      package: packageSlug,
      timezone: 'Asia/Seoul',
      slots,
    });
  } catch (e) {
    if (e instanceof InvalidDateInputError) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    }
    console.error('[api/availability] failed:', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
