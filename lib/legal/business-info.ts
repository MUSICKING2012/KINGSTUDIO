/**
 * 전자상거래법 §10 표시사항 단일 출처.
 * 값은 한국어 원본이 정본 — 신고·등기 기록과 대조 가능해야 하므로 번역하지 않는다.
 * 라벨만 messages/*.json 의 footer.legal.* 로 번역한다.
 *
 * ⚠ mailOrderNo 는 종로구청 발급인데 영업소는 강남이다(소재지 변경신고 미해소).
 *    PG 재심사 실사 대조 항목 — 코드가 아니라 신고 정정으로만 해소된다. 대표 액션.
 * ⚠ 호스팅서비스 제공자 표시(§10 필수)는 인프라 확정 후 이 파일에 추가한다. 현재 결손.
 */
export const BUSINESS_INFO = {
  companyKo: '뮤직킹(주)',
  companyEn: 'MUSICKING Co., Ltd.', // 법인등기부 등록 영문명
  ceo: '노광균',
  bizNo: '374-87-00654',
  mailOrderNo: '2021-서울종로-0949',
  privacyOfficer: '노광균',
  address: '서울특별시 강남구 삼성로75길 52, B1',
  email: 'studio@musicking.co.kr',
  tel: '+82-2-6349-2429',
} as const;
