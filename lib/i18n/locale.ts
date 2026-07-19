import type { Locale as PrismaLocale } from '@prisma/client';
import type { Locale as RoutingLocale } from './routing';

// next-intl uses hyphenated locale tags (zh-HK / zh-CN); the Prisma `Locale` enum uses underscore
// identifiers (zh_HK / zh_CN, @map'd to the hyphen value in the DB column). The Prisma client speaks
// the identifier, so convert routing→Prisma before any DB query keyed by locale (e.g. listSongs).
export function toPrismaLocale(locale: RoutingLocale): PrismaLocale {
  return locale.replace('-', '_') as PrismaLocale;
}
