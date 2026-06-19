import { AdminLoginForm } from '@/components/admin/login-form';

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6">
      <h1 className="text-center text-2xl font-bold">KING STUDIO Admin</h1>
      <AdminLoginForm />
    </main>
  );
}
