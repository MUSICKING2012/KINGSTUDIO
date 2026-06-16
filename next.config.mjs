import createNextIntlPlugin from 'next-intl/plugin';

// next-intl request config lives in /lib/i18n per CLAUDE.md §2 folder structure.
const withNextIntl = createNextIntlPlugin('./lib/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
