import { describe, expect, it, vi, beforeEach } from 'vitest';
import { sendEmail } from './send';

beforeEach(() => { delete process.env.RESEND_API_KEY; });

describe('sendEmail (dev stub)', () => {
  it('logs the email when no RESEND_API_KEY (returns dev:true)', async () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const r = await sendEmail({ to: 'a@b.com', subject: 'Hi', text: 'verify: http://x/y' });
    expect(r.dev).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
