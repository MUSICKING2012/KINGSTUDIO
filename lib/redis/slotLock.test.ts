import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SLOT_LOCK_TTL_MS, SlotLockError, withSlotLock } from './slotLock';

const { mockSet, mockEval } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockEval: vi.fn(),
}));

vi.mock('./client', () => ({ getRedis: () => ({ set: mockSet, eval: mockEval }) }));

beforeEach(() => {
  mockSet.mockReset();
  mockEval.mockReset();
  mockEval.mockResolvedValue(1);
});

describe('withSlotLock', () => {
  it('acquires lock with correct key, NX flag, and TTL', async () => {
    mockSet.mockResolvedValue('OK');
    await withSlotLock('room-A', '2026-07-01', async () => {});
    expect(mockSet).toHaveBeenCalledOnce();
    expect(mockSet.mock.calls[0][0]).toBe('slot_lock:room-A:2026-07-01');
    expect(mockSet.mock.calls[0][2]).toMatchObject({ nx: true, px: SLOT_LOCK_TTL_MS });
  });

  it('returns the value from fn', async () => {
    mockSet.mockResolvedValue('OK');
    const result = await withSlotLock('room-A', '2026-07-01', async () => ({ bookingId: 'abc' }));
    expect(result).toEqual({ bookingId: 'abc' });
  });

  it('releases lock after fn succeeds (eval called once)', async () => {
    mockSet.mockResolvedValue('OK');
    await withSlotLock('room-A', '2026-07-01', async () => {});
    expect(mockEval).toHaveBeenCalledOnce();
  });

  it('releases lock even when fn throws', async () => {
    mockSet.mockResolvedValue('OK');
    await expect(
      withSlotLock('room-A', '2026-07-01', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(mockEval).toHaveBeenCalledOnce();
  });

  it('throws SlotLockError when lock is already held (set returns null)', async () => {
    mockSet.mockResolvedValue(null);
    await expect(withSlotLock('room-A', '2026-07-01', async () => {})).rejects.toBeInstanceOf(
      SlotLockError,
    );
  });

  it('does not call fn or release when lock acquisition fails', async () => {
    mockSet.mockResolvedValue(null);
    const fn = vi.fn();
    await expect(withSlotLock('room-A', '2026-07-01', fn)).rejects.toBeInstanceOf(SlotLockError);
    expect(fn).not.toHaveBeenCalled();
    expect(mockEval).not.toHaveBeenCalled();
  });

  it('SlotLockError carries roomId and date', async () => {
    mockSet.mockResolvedValue(null);
    const err = await withSlotLock('room-A', '2026-07-01', async () => {}).catch((e) => e);
    expect(err).toBeInstanceOf(SlotLockError);
    expect(err.roomId).toBe('room-A');
    expect(err.date).toBe('2026-07-01');
  });

  it('passes the same token to set and release (compare-and-delete)', async () => {
    mockSet.mockResolvedValue('OK');
    await withSlotLock('room-A', '2026-07-01', async () => {});
    const storedToken = mockSet.mock.calls[0][1];
    const releaseArgs = mockEval.mock.calls[0][2]; // third arg: [token]
    expect(releaseArgs[0]).toBe(storedToken);
  });

  it('different room+date pairs use independent keys', async () => {
    mockSet.mockResolvedValue('OK');
    await withSlotLock('room-A', '2026-07-01', async () => {});
    await withSlotLock('room-A', '2026-07-02', async () => {});
    await withSlotLock('room-B', '2026-07-01', async () => {});
    expect(mockSet.mock.calls[0][0]).toBe('slot_lock:room-A:2026-07-01');
    expect(mockSet.mock.calls[1][0]).toBe('slot_lock:room-A:2026-07-02');
    expect(mockSet.mock.calls[2][0]).toBe('slot_lock:room-B:2026-07-01');
  });
});
