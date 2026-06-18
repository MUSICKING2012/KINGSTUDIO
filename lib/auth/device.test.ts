import { describe, expect, it } from 'vitest';
import { metaFromHeaders } from './device';

describe('metaFromHeaders', () => {
  it('reads ip, country, user-agent', () => {
    const h = new Headers({
      'x-forwarded-for': '203.0.113.9, 10.0.0.1',
      'cf-ipcountry': 'TW',
      'user-agent': 'UA/1.0',
    });
    expect(metaFromHeaders(h)).toEqual({ ip: '203.0.113.9', country: 'TW', userAgent: 'UA/1.0' });
  });
  it('returns nulls when absent', () => {
    expect(metaFromHeaders(new Headers())).toEqual({ ip: null, country: null, userAgent: null });
  });
});
