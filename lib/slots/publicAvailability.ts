// Public (customer-facing) availability — PURE layer, no prisma import, so the union rule and
// tier grid are unit-testable in the cloud vitest harness (Session_Handoff §5).
//
// Multi-room model (PRD §5.3 line 223 "슬롯 가용성 계산 로직은 처음부터 멀티룸 전제로 설계"):
// a slot time is bookable if it is free in AT LEAST ONE active room. The specific room is
// neither chosen nor exposed here — room auto-assignment happens at confirmBooking (Stage D).
// At launch only STUDIO A is active, so the union == that one room; flipping STUDIO B active
// (rooms.is_active) needs no code change. The DB read that feeds `perRoom` lives in the route
// handler (app/api/availability), which keeps prisma out of this module.

import type { AvailableSlot } from './availability';
import {
  PACKAGE_SLOT_MINUTES,
  PACKAGE_START_TIMES,
  type PackageTier,
  SLOT_START_MINUTE,
} from './constants';
import { toKstTimeString } from './time';

export type PublicSlot = { startTime: string; endTime: string };

// Package.name → slot-grid tier. Only the 5 grid packages self-serve a slot picker. Group
// packages (K-Pop Making Class / 꿈길 / 워크샵) have no fixed grid in constants.ts (B2B
// pre-arranged timing) → null → not slot-bookable in the public flow.
const GRID_TIERS = new Set<string>(Object.keys(PACKAGE_START_TIMES));

export function resolvePackageTier(packageName: string): PackageTier | null {
  return GRID_TIERS.has(packageName) ? (packageName as PackageTier) : null;
}

// The full fixed grid for a tier (every start time → start/end "HH:MM:00" KST), independent of
// bookings. The route annotates each entry with `available` by membership in the union result,
// so the UI can render sold-out slots too (WCAG: colour + text + icon, not colour alone).
export function tierFullGrid(tier: PackageTier): PublicSlot[] {
  const slotMin = PACKAGE_SLOT_MINUTES[tier];
  return PACKAGE_START_TIMES[tier].map((h) => ({
    startTime: toKstTimeString(h, SLOT_START_MINUTE),
    endTime: toKstTimeString(h + Math.floor(slotMin / 60), slotMin % 60),
  }));
}

// Union over per-room availability lists, filtered to one tier and de-duplicated by start time.
// getAvailability already excludes booked/blackout slots per room, so a start time surviving in
// any room list means "free somewhere" = bookable.
export function unionTierSlots(perRoom: AvailableSlot[][], tier: PackageTier): PublicSlot[] {
  const byStart = new Map<string, PublicSlot>();
  for (const roomSlots of perRoom) {
    for (const s of roomSlots) {
      if (s.packageTier !== tier) continue;
      if (!byStart.has(s.startTime)) {
        byStart.set(s.startTime, { startTime: s.startTime, endTime: s.endTime });
      }
    }
  }
  return [...byStart.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
}
