import { CurrencySelector } from './currency-selector';
import { LocaleSelector } from './locale-selector';

/** ④-b 미니멀 바 — 로고·네비 없음(실헤더는 stitch 확장과 함께 별도 슬라이스). 서버 컴포넌트. */
export function SiteHeader() {
  return (
    <header className="flex items-center justify-end gap-2 border-b border-border/20 px-margin-mobile py-2 md:px-margin-desktop">
      <LocaleSelector />
      <CurrencySelector />
    </header>
  );
}
