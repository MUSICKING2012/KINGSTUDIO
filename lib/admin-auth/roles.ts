// Permission vocabulary (PRD 5.8 + 5.8-A). Sensitive (reauth-gated) ones noted in comments.
// This file has NO imports so the seed script (tsx) and E2E (Playwright) can import it
// without dragging in the '@/' alias chain (which only Next.js + Vitest resolve).
export const ALL_PERMISSIONS = [
  'booking:read', 'booking:write', 'blackout:manage', 'cs:respond',
  'content:upload', 'magiclink:reissue', 'mv:receive', 'photo:select', 'checkin:write',
  'refund:process', 'revenue:read', 'revenue:export', 'taxinvoice:issue',
  'review:manage', 'ugc:manage', 'promo:manage', 'campaign:send',
  'settings:manage',
  // sensitive — reauth-gated:
  'role:grant', 'terms:publish', 'account:manage', 'export:bulk', 'bucketlock:retention',
  'gate:mr_predelivery', 'gate:license_display', 'seo:custom_script',
] as const;
export type Permission = (typeof ALL_PERMISSIONS)[number];

// §5.8-A is more restrictive than §5.8 → fail-safe: the 3 gates are Super Admin only.
const MANAGER_EXCLUDED = ['refund:process', 'role:grant', 'terms:publish', 'gate:mr_predelivery', 'gate:license_display', 'seo:custom_script'];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': ['*'],
  Manager: ALL_PERMISSIONS.filter((p) => !MANAGER_EXCLUDED.includes(p)),
  Operator: ['booking:read', 'booking:write', 'blackout:manage', 'cs:respond'],
  'Content Manager': ['content:upload', 'magiclink:reissue', 'mv:receive'],
  // ⚠ ROW-SCOPE REQUIRED: Engineer's checkin/upload/select must be limited to own assigned
  // bookings (booking.engineerId === adminId) when those features are built. NOT enforced here.
  Engineer: ['checkin:write', 'content:upload', 'photo:select'],
  Accountant: ['revenue:read', 'revenue:export', 'refund:process', 'taxinvoice:issue'],
  Marketer: ['review:manage', 'ugc:manage', 'promo:manage', 'campaign:send'],
};

export function hasPermission(perms: string[], required: string): boolean {
  return perms.includes('*') || perms.includes(required);
}
