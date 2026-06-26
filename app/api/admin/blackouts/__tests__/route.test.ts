import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockAdminAuth,
  mockValidateAdminSession,
  mockAdminUserFindUnique,
  mockRequirePermission,
  mockBlackoutCreate,
  mockAuditLogCreate,
} = vi.hoisted(() => ({
  mockAdminAuth: vi.fn(),
  mockValidateAdminSession: vi.fn(),
  mockAdminUserFindUnique: vi.fn(),
  mockRequirePermission: vi.fn(),
  mockBlackoutCreate: vi.fn(),
  mockAuditLogCreate: vi.fn(),
}));

vi.mock('@/adminAuth', () => ({ adminAuth: mockAdminAuth }));
vi.mock('@/lib/admin-auth/session', () => ({ validateAdminSession: mockValidateAdminSession }));
vi.mock('@/lib/admin-auth/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin-auth/rbac')>();
  return { ...actual, requirePermission: mockRequirePermission };
});
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    adminUser: { findUnique: mockAdminUserFindUnique },
    blackout: { create: mockBlackoutCreate },
    auditLog: { create: mockAuditLogCreate },
  },
}));

const ADMIN_ID = 'admin-test-001';
const CREATED_BLACKOUT = { id: 'bk-created-001', scope: 'slot' };

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/blackouts', {
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

const VALID_SLOT_BODY = {
  scope: 'slot',
  dateStart: '2026-07-10',
  dateEnd: '2026-07-10',
  reason: 'internal_use',
  timeStart: { h: 10, m: 0 },
  timeEnd: { h: 12, m: 0 },
};

beforeEach(() => {
  vi.resetAllMocks();
  mockBlackoutCreate.mockResolvedValue(CREATED_BLACKOUT);
  mockAuditLogCreate.mockResolvedValue({});
});

describe('POST /api/admin/blackouts — route integration', () => {
  it('auth통과 + valid body → 201, blackout row 1, auditLog row 1', async () => {
    passAuth();
    const { POST } = await import('../route');
    const res = await POST(makeReq(VALID_SLOT_BODY));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.blackout).toEqual(CREATED_BLACKOUT);

    expect(mockBlackoutCreate).toHaveBeenCalledOnce();
    expect(mockAuditLogCreate).toHaveBeenCalledOnce();
    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'blackout_create', targetType: 'blackout' }),
      }),
    );
  });

  it('invalid body (slot dateStart≠dateEnd) → 422, blackout row 0', async () => {
    passAuth();
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID_SLOT_BODY, dateEnd: '2026-07-11' }));

    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('validation');
    expect(json.field).toBe('dateEnd');

    expect(mockBlackoutCreate).not.toHaveBeenCalled();
    expect(mockAuditLogCreate).not.toHaveBeenCalled();
  });
});
