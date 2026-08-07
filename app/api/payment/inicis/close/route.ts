import { type Locale, defaultLocale, locales } from '@/lib/i18n/routing';

// 이니시스 표준결제창 닫힘(closeUrl) — 결제창 레이어(iframe) 내부에서 로드되므로 303 redirect 로는
// 최상위 창을 되돌릴 수 없다. 부모 창을 체크아웃으로 전체 이동시키는 최소 HTML 을 반환한다
// (draft 는 sessionStorage 에 보존 → 재시도 가능. 청구는 발생 전이라 원복 불필요).
export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

function checkoutPath(request: Request): string {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get('locale');
  const pkg = url.searchParams.get('package');
  const locale = locales.includes(localeParam as Locale) ? localeParam : defaultLocale;
  const qs = pkg && SLUG_RE.test(pkg) ? `?package=${encodeURIComponent(pkg)}` : '';
  return `/${locale}/booking/checkout${qs}`;
}

function closeResponse(request: Request): Response {
  // JSON.stringify 로 문자열 리터럴 이스케이프(경로 구성 요소는 위에서 화이트리스트 검증됨).
  const target = JSON.stringify(checkoutPath(request));
  const html = `<!doctype html><meta charset="utf-8"><script>
(window.top || window.parent || window).location.replace(${target});
</script>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function GET(request: Request): Promise<Response> {
  return closeResponse(request);
}

export async function POST(request: Request): Promise<Response> {
  return closeResponse(request);
}
