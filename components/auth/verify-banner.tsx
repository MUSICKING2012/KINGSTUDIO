import { getTranslations } from 'next-intl/server';

export async function VerifyBanner({ verified }: { verified: boolean }) {
  if (verified) return null;
  const t = await getTranslations('auth.banner');
  return <div role="status" className="bg-yellow-100 p-2 text-center text-sm text-yellow-900">{t('unverified')}</div>;
}
