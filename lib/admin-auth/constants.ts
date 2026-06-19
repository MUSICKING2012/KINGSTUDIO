// Single source for reauth method String values (until AuthMethod enum-ification — tracked).
export const AUTH_METHOD = { PASSWORD_TOTP: 'password+totp' } as const;
export type AuthMethod = (typeof AUTH_METHOD)[keyof typeof AUTH_METHOD];

export const ADMIN_SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h sliding inactivity (PRD 5.8)
export const ADMIN_MAX_CONCURRENT_SESSIONS = 3; // PRD 5.8
export const ADMIN_LOCKOUT_THRESHOLD = 5; // consecutive fails
export const ADMIN_LOCKOUT_MS = 30 * 60 * 1000; // 30 min
