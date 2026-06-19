'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminLoginAction } from '@/lib/admin-auth/actions';
import { type AdminLoginInput, adminLoginSchema } from '@/lib/validations/admin-auth';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export function AdminLoginForm() {
  const router = useRouter();
  const [err, setErr] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<AdminLoginInput>({ resolver: zodResolver(adminLoginSchema) });
  async function onSubmit(values: AdminLoginInput) {
    setErr('');
    const r = await adminLoginAction(values);
    if (!r.ok) {
      setErr('Invalid credentials.');
      return;
    }
    router.push('/admin/dashboard');
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register('password')} />
      </div>
      <div>
        <Label htmlFor="totp">2FA code</Label>
        <Input id="totp" inputMode="numeric" {...register('totp')} />
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
