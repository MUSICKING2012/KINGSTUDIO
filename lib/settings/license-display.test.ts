import { describe, expect, it } from 'vitest';
import { isLicenseDisplayEnabled } from './license-display';

// §5.7 / §4 danger zone. The song-catalog & download license-attribution box stays OFF in MVP
// until an admin sets `license_display_enabled` to literal boolean true. Showing license
// attribution without that gate is a false-advertising risk → the parser must FAIL SAFE: anything
// other than `true` (absent row, false, truthy-but-not-true) resolves to false.
describe('isLicenseDisplayEnabled (§5.7 license-display gate, fail-safe)', () => {
  it('is true only for the literal boolean true', () => {
    expect(isLicenseDisplayEnabled(true)).toBe(true);
  });

  it('is false when the setting row is absent (null / undefined)', () => {
    expect(isLicenseDisplayEnabled(null)).toBe(false);
    expect(isLicenseDisplayEnabled(undefined)).toBe(false);
  });

  it('is false for explicit false', () => {
    expect(isLicenseDisplayEnabled(false)).toBe(false);
  });

  it('fails safe for truthy-but-not-true values (string "true", 1, {})', () => {
    expect(isLicenseDisplayEnabled('true')).toBe(false);
    expect(isLicenseDisplayEnabled(1)).toBe(false);
    expect(isLicenseDisplayEnabled({})).toBe(false);
  });
});
