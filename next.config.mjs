import { existsSync, readFileSync } from 'node:fs';
import createNextIntlPlugin from 'next-intl/plugin';

// next-intl request config lives in /lib/i18n per CLAUDE.md §2 folder structure.
const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

// 5e-2: 구 Ghost URL(/{slug}/) → /en/blog/{slug} 영구 리다이렉트(308 — /rental·/experience 규약). 맵은 이관 스크립트가 재생성하는
// content/blog/legacy-redirects.json 이 정본(Blog_Slice_Spec §3). 빌드 시점 정적 로드 —
// next-intl 미들웨어보다 먼저 평가되므로 로케일 접두 간섭 없음.
const LEGACY_REDIRECTS_PATH = new URL('./content/blog/legacy-redirects.json', import.meta.url);
const legacyBlogRedirects = existsSync(LEGACY_REDIRECTS_PATH)
  ? JSON.parse(readFileSync(LEGACY_REDIRECTS_PATH, 'utf8'))
  : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return legacyBlogRedirects.map(({ source, destination }) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default withNextIntl(nextConfig);
