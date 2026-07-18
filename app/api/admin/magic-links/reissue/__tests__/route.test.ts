import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stage E2 route unit tests (S2.5b-0 chain, mirrors blackouts route.test.ts pattern).
// Concurrency of the reissue primitive itself is covered by E1 lib tests (advisory lock).

const {
  mockAdminAuth,
  mockValidateAdminSession,
  mockAdminUserFindUnique,
  mockRequirePermission,
  mockReissueMagicLink,
  mockAuditLogCreate,
} = vi.hoisted(() => ({
  mockAdminAuth: vi.fn(),
  mockValidateAdminSession: vi.fn(),
  mockAdminUserFindUnique: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockReissueMagicLink: vi.fn(),
  mockAuditLogCreate: vi.fn(),
}));

vi.mock('@/adminAuth', () => ({ adminAuth: mockAdminAuth }));
vi.mock('@/lib/admin-auth/session', () => ({ validateAdminSession: mockValidateAdminSession }));
vi.mock('@/lib/admin-auth/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin-auth/rbac')>();
  return { ...actual, requirePermission: mockRequirePermission };
});
vi.mock('@/lib/download/magicLink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/download/magicLink')>();
  return { ...actual, reissueMagicLink: mockReissueMagicLink };
});
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    adminUser: { findUnique: mockAdminUserFindUnique },
    auditLog: { create: mockAuditLogCreate },
  },
}));

import { BookingNotFoundError } from '@/lib/download/magicLink';
import { POST } from '../route';

const ADMIN_ID = 'admin-test-001';
const BOOKING_ID = 'bkg-test-001';
const RAW_TOKEN = 'raw-token-only-in-response-x9';
const ISSUED = {
  rawToken: RAW_TOKEN,
  magicLink: { id: 'ml-new-001', expiresAt: new Date('2026-09-16T00:00:00Z'), status: 'active' },
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/magic-links/reissue', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function passAuth() {
  mockAdminAuth.mockResolvedValue({ sessionId: 'sess-001', user: { id: ADMIN_ID } });
  mockValidateAdminSession.mockResolvedValue({ adminUserId: ADMIN_ID });
  mockAdminUserFindUnique.mockResolvedValue({ status: 'active' });
  mockRequirePermission.mockResolvedValue(undefined);
}

beforeEach(() => {
  vi.resetAllMocks();
  mockReissueMagicLink.mockResolvedValue(ISSUED);
  mockAuditLogCreate.mockResolvedValue({});
});

describe('POST /api/admin/magic-links/reissue — auth chain (S2.5b-0)', () => {
  it('401 without a JWT session', async () => {
    mockAdminAuth.mockResolvedValue(null);
    const res = await POST(makeReq({ bookingId: BOOKING_ID }));
    expect(res.status).toBe(401);
    expect(mockReissueMagicLink).not.toHaveBeenCalled();
  });

  it('401 when AdminSession (DB SoT) is invalid despite a JWT', async () => {
    mockAdminAuth.mockResolvedValue({ sessionId: 'sess-zombie' });
    mockValidateAdminSession.mockResolvedValue(null);
    const res = await POST(makeReq({ bookingId: BOOKING_ID }));
    expect(res.status).toBe(401);
    expect(mockReissueMagicLink).not.toHaveBeenCalled();
  });

  it('401 when the admin account is not active (locked/inactive)', async () => {
    mockAdminAuth.mockResolvedValue({ sessionId: 'sess-001' });
    mockValidateAdminSession.mockResolvedValue({ adminUserId: ADMIN_ID });
    mockAdminUserFindUnique.mockResolvedValue({ status: 'locked' });
    const res = await POST(makeReq({ bookingId: BOOKING_ID }));
    expect(res.status).toBe(401);
    expect(mockReissueMagicLink).not.toHaveBeenCalled();
  });

  it('403 forbidden without magiclink:reissue', async () => {
    passAuth();
    const { ForbiddenError } = await import('@/lib/admin-auth/rbac');
    mockRequirePermission.mockRejectedValue(new ForbiddenError('magiclink:reissue'));
    const res = await POST(makeReq({ bookingId: BOOKING_ID }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden' });
    expect(mockReissueMagicLink).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/magic-links/reissue — input + outcome', () => {
  it('400 on non-JSON body', async () => {
    passAuth();
    const req = new NextRequest('http://localhost/api/admin/magic-links/reissue', {
      method: 'POST',
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('400 when bookingId is missing or not a string', async () => {
    passAuth();
    for (const body of [{}, { bookingId: 42 }, { bookingId: '' }]) {
      const res = await POST(makeReq(body));
      expect(res.status).toBe(400);
    }
    expect(mockReissueMagicLink).not.toHaveBeenCalled();
  });

  it('404 when the booking does not exist', async () => {
    passAuth();
    mockReissueMagicLink.mockRejectedValue(new BookingNotFoundError(BOOKING_ID));
    const res = await POST(makeReq({ bookingId: BOOKING_ID }));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'booking_not_found' });
    expect(mockAuditLogCreate).not.toHaveBeenCalled();
  });

  it('201 happy path — returns the raw token once + writes a token-free audit record', async () => {
    passAuth();
    const res = await POST(makeReq({ bookingId: BOOKING_ID }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.magicLinkId).toBe('ml-new-001');
    expect(body.rawToken).toBe(RAW_TOKEN);
    expect(mockReissueMagicLink).toHaveBeenCalledWith(BOOKING_ID);

    // Audit: action + booking target + magic_link PK — and NEVER the raw token (하드제약 #6).
    expect(mockAuditLogCreate).toHaveBeenCalledTimes(1);
    const auditArg = mockAuditLogCreate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(auditArg.data.action).toBe('magic_link_reissue');
    expect(auditArg.data.actorAdminUserId).toBe(ADMIN_ID);
    expect(auditArg.data.targetType).toBe('booking');
    expect(auditArg.data.targetId).toBe(BOOKING_ID);
    expect(JSON.stringify(auditArg.data)).not.toContain(RAW_TOKEN);
  });
});
