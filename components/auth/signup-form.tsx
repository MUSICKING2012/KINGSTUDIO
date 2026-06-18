'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/i18n/navigation';
import { useState } from 'react';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';
import { signupAction } from '@/lib/auth/actions';
import { PasswordStrength } from './password-strength';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignupForm() {
  const t = useTranslations('auth.signup');
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, watch, formState: { isSubmitting } } =
    useForm<SignupInput>({ resolver: zodResolver(signupSchema) });
  const pw = watch('password') ?? '';

  async function onSubmit(values: SignupInput) {
    setServerError('');
    const r = await signupAction(values);
    if (!r.ok) {
      const map: Record<string, string> = {
        'email.taken': t('errors.email.taken'),
        'password.weak': t('errors.password.weak'),
        'password.pwned': t('errors.password.pwned'),
      };
      setServerError(map[r.error] ?? t('errors.password.weak'));
      return;
    }
    router.push('/my');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div><Label htmlFor="name">{t('name')}</Label><Input id="name" {...register('name')} /></div>
      <div><Label htmlFor="email">{t('email')}</Label><Input id="email" type="email" {...register('email')} /></div>
      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input id="password" type="password" {...register('password')} />
        <PasswordStrength value={pw} label={t('strength')} />
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">{t('submit')}</Button>
    </form>
  );
}
