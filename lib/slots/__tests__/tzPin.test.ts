import { describe, expect, it } from 'vitest';
import { InvalidDateInputError, assertDateString } from '../time';

describe('TZ pin — 테스트 환경 타임존 고정', () => {
  it('프로세스 TZ가 Asia/Seoul(UTC+9, offset -540)로 고정됨', () => {
    expect(new Date('2026-07-01').getTimezoneOffset()).toBe(-540);
  });
  it('TZ가 정확히 Asia/Seoul (지명 잠금)', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Asia/Seoul');
  });
});

describe('assertDateString — 위험 입력 거부 회귀 가드', () => {
  const reject = [
    '2026-6-24', // 한 자리 month/day
    '2026-06-24T00:00:00Z', // datetime 접미사
    '2026-06-24 ', // trailing space
    '', // 빈 문자열
    '2026/06/24', // 잘못된 구분자
    '26-06-24', // 2자리 연도
  ];
  for (const input of reject) {
    it(`거부: ${JSON.stringify(input)} → InvalidDateInputError throw`, () => {
      expect(() => assertDateString(input)).toThrow(InvalidDateInputError);
    });
  }
  it('통과: "2026-06-24" → throw 안 함 (대조군)', () => {
    expect(() => assertDateString('2026-06-24')).not.toThrow();
  });
});
