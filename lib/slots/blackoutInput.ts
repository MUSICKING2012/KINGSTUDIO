import type { BlackoutReason, BlackoutScope } from '@prisma/client';
import { assertValidWeeklyRule } from './blackout';
import { assertDateString, toKstTimeString } from './time';

export class BlackoutValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = 'BlackoutValidationError';
    this.field = field;
  }
}

export type BlackoutInputNormalized = {
  scope: BlackoutScope;
  dateStart: string;
  dateEnd: string;
  timeStart: string | null;
  timeEnd: string | null;
  recurringRule: string | null;
  reason: BlackoutReason;
  reasonNote: string | null;
  roomId: string | null;
};

const VALID_SCOPES = new Set<string>(['slot', 'full_day', 'recurring']);
const VALID_REASONS = new Set<string>([
  'internal_use',
  'maintenance',
  'holiday',
  'external_channel',
  'other',
]);

function assertTime(field: string, hm: unknown): asserts hm is { h: number; m: number } {
  if (hm == null || typeof hm !== 'object') {
    throw new BlackoutValidationError(field, `${field} is required`);
  }
  const { h, m } = hm as Record<string, unknown>;
  if (!Number.isInteger(h) || (h as number) < 0 || (h as number) > 23) {
    throw new BlackoutValidationError(`${field}.h`, `${field}.h must be 0–23`);
  }
  if (!Number.isInteger(m) || (m as number) < 0 || (m as number) > 59) {
    throw new BlackoutValidationError(`${field}.m`, `${field}.m must be 0–59`);
  }
}

export function validateBlackoutInput(raw: unknown): BlackoutInputNormalized {
  if (raw === null || typeof raw !== 'object') {
    throw new BlackoutValidationError('body', 'request body must be an object');
  }
  const r = raw as Record<string, unknown>;

  const scope = r.scope as string;
  if (!VALID_SCOPES.has(scope)) {
    throw new BlackoutValidationError('scope', 'scope must be one of: slot, full_day, recurring');
  }

  const reason = r.reason as string;
  if (!VALID_REASONS.has(reason)) {
    throw new BlackoutValidationError(
      'reason',
      'reason must be one of: internal_use, maintenance, holiday, external_channel, other',
    );
  }

  const dateStart = r.dateStart as string;
  const dateEnd = r.dateEnd as string;
  try {
    assertDateString(dateStart);
  } catch {
    throw new BlackoutValidationError('dateStart', 'dateStart must be YYYY-MM-DD');
  }
  try {
    assertDateString(dateEnd);
  } catch {
    throw new BlackoutValidationError('dateEnd', 'dateEnd must be YYYY-MM-DD');
  }

  const timeStartRaw = r.timeStart as { h: number; m: number } | null | undefined;
  const timeEndRaw = r.timeEnd as { h: number; m: number } | null | undefined;
  const recurringRule = (r.recurringRule as string | null | undefined) ?? null;
  const reasonNote = (r.reasonNote as string | null | undefined) ?? null;
  const roomId = (r.roomId as string | null | undefined) ?? null;

  let timeStart: string | null = null;
  let timeEnd: string | null = null;

  if (scope === 'slot') {
    if (dateStart !== dateEnd) {
      throw new BlackoutValidationError('dateEnd', 'slot scope requires dateStart === dateEnd');
    }
    if (recurringRule != null) {
      throw new BlackoutValidationError(
        'recurringRule',
        'recurringRule must not be set for slot scope',
      );
    }
    assertTime('timeStart', timeStartRaw);
    assertTime('timeEnd', timeEndRaw);
    timeStart = toKstTimeString(timeStartRaw.h, timeStartRaw.m);
    timeEnd = toKstTimeString(timeEndRaw.h, timeEndRaw.m);
    if (timeStart >= timeEnd) {
      throw new BlackoutValidationError('timeEnd', 'timeEnd must be after timeStart');
    }
  } else if (scope === 'full_day') {
    if (dateStart > dateEnd) {
      throw new BlackoutValidationError('dateEnd', 'dateEnd must be >= dateStart');
    }
    if (timeStartRaw != null) {
      throw new BlackoutValidationError(
        'timeStart',
        'timeStart must not be set for full_day scope',
      );
    }
    if (timeEndRaw != null) {
      throw new BlackoutValidationError('timeEnd', 'timeEnd must not be set for full_day scope');
    }
    if (recurringRule != null) {
      throw new BlackoutValidationError(
        'recurringRule',
        'recurringRule must not be set for full_day scope',
      );
    }
  } else {
    // recurring
    if (dateStart > dateEnd) {
      throw new BlackoutValidationError('dateEnd', 'dateEnd must be >= dateStart');
    }
    if (recurringRule == null) {
      throw new BlackoutValidationError(
        'recurringRule',
        'recurringRule is required for recurring scope',
      );
    }
    try {
      assertValidWeeklyRule(recurringRule);
    } catch (e) {
      throw new BlackoutValidationError('recurringRule', (e as Error).message);
    }
    assertTime('timeStart', timeStartRaw);
    assertTime('timeEnd', timeEndRaw);
    timeStart = toKstTimeString(timeStartRaw.h, timeStartRaw.m);
    timeEnd = toKstTimeString(timeEndRaw.h, timeEndRaw.m);
    if (timeStart >= timeEnd) {
      throw new BlackoutValidationError('timeEnd', 'timeEnd must be after timeStart');
    }
  }

  return {
    scope: scope as BlackoutScope,
    dateStart,
    dateEnd,
    timeStart,
    timeEnd,
    recurringRule,
    reason: reason as BlackoutReason,
    reasonNote,
    roomId,
  };
}
