import { adminAuth } from '@/adminAuth';
import { Button } from '@/components/ui/button';
import { adminLogoutAction } from '@/lib/admin-auth/actions';
import { getAdminPermissions } from '@/lib/admin-auth/rbac';
import { prisma } from '@/lib/db/prisma';

export default async function AdminDashboard() {
  const session = await adminAuth();
  const adminId = (session?.user as { id?: string } | undefined)?.id;
  const admin = adminId ? await prisma.adminUser.findUnique({ where: { id: adminId } }) : null;
  const perms = adminId ? await getAdminPermissions(adminId) : [];
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>
      <p className="text-muted-foreground">{admin?.email}</p>
      <p className="text-xs text-muted-foreground">permissions: {perms.length}</p>
      <form
        action={async () => {
          'use server';
          await adminLogoutAction();
        }}
      >
        <Button type="submit" variant="outline" className="w-full">
          Log out
        </Button>
      </form>
    </main>
  );
}
