import { prisma } from '@/lib/db/prisma';
import type { StudioEquipment, StudioRoomProfile, TeamMember } from '@prisma/client';

// STUDIOS intro-page content read layer (5d-3, `Studio_Slice_Spec.md` §4).
// Marketing content only — never joins the operational Room/booking tables (PRD §5.3:
// customers never see operational rooms; auto-assignment).

export async function listStudioRoomProfiles(): Promise<StudioRoomProfile[]> {
  return prisma.studioRoomProfile.findMany({
    where: { isVisible: true },
    orderBy: { displayOrder: 'asc' },
  });
}

export async function listStudioEquipment(): Promise<StudioEquipment[]> {
  return prisma.studioEquipment.findMany({
    where: { isVisible: true },
    orderBy: { displayOrder: 'asc' },
  });
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  return prisma.teamMember.findMany({
    where: { isVisible: true },
    orderBy: { displayOrder: 'asc' },
  });
}

/// 평 → ㎡, deterministic conversion (1평 = 3.3058㎡), integer rounding — display only.
export function pyeongToSquareMeters(pyeong: number): number {
  return Math.round(pyeong * 3.3058);
}
