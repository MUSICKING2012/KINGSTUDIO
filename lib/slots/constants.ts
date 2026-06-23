// Slot grid constants — source of truth: PRD §5.3 "영업시간 및 슬롯 구조" table.
// PackageTier is a local string union (no Prisma enum exists); keyed by Package.name canonical value.
// Group packages (Making Class / 꿈길 / 워크샵) have no fixed grid — B2B pre-arranged timing.

export type PackageTier = 'Gold' | 'Diamond' | 'Premium' | '1Hour' | '1Pro';

// Session duration in minutes per package (PRD §5.3; mirrors Package.slotMinutes in DB).
export const PACKAGE_SLOT_MINUTES: Record<PackageTier, number> = {
  Gold:    120, // 2h
  Diamond: 120, // 2h
  Premium: 180, // 3h
  '1Hour':  60, // 1h
  '1Pro':  210, // 3.5h → end minute = 30
};

// Start hours (KST, integer). All start times happen to be on the hour (start minute = 0).
// endTime = toKstTimeString(h + floor(slotMinutes/60), slotMinutes % 60)
export const PACKAGE_START_TIMES: Record<PackageTier, number[]> = {
  Gold:    [10, 12, 14, 16, 18, 20], // 2h × 6 slots: 10–12 … 20–22
  Diamond: [10, 12, 14, 16, 18, 20], // 2h × 6 slots: same grid as Gold
  Premium: [10, 14, 18],             // 3h × 3 slots: 10–13, 14–17, 18–21
  '1Hour': [10, 12, 14, 16, 18],     // 1h × 5 slots: 10–11 … 18–19
  '1Pro':  [10, 14, 18],             // 3.5h × 3 slots: 10–13:30, 14–17:30, 18–21:30
};

// All slot start times are on the hour (start minute = 0).
export const SLOT_START_MINUTE = 0;

// Operating window: 10:00–22:00 KST daily (PRD §5.3). No weekday difference.
export const OPERATING_WINDOW = { startH: 10, endH: 22 } as const;
