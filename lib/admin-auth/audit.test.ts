import { beforeEach, describe, expect, it, vi } from 'vitest';
import { writeAudit } from './audit';

const { mockAuditLogCreate } = vi.hoisted(() => ({
  mockAuditLogCreate: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    auditLog: { create: mockAuditLogCreate },
  },
}));

beforeEach(() => {
  mockAuditLogCreate.mockReset();
  mockAuditLogCreate.mockResolvedValue({});
});

describe('writeAudit', () => {
  it('calls prisma.auditLog.create with exact input', async () => {
    const input = {
      actorAdminUserId: 'admin-123',
      action: 'blackout_create' as const,
      targetType: 'blackout',
      targetId: 'bk-456',
      metadata: { scope: 'slot', dateStart: '2026-07-10', dateEnd: '2026-07-10', roomId: null },
    };
    await writeAudit(input);
    expect(mockAuditLogCreate).toHaveBeenCalledOnce();
    expect(mockAuditLogCreate).toHaveBeenCalledWith({ data: input });
  });

  it('passes optional fields (ip, userAgent) through verbatim', async () => {
    const input = {
      actorAdminUserId: null,
      action: 'login' as const,
      ip: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    };
    await writeAudit(input);
    expect(mockAuditLogCreate).toHaveBeenCalledWith({ data: input });
  });
});
