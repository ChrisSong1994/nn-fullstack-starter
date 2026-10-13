/**
 * 后台 · 用户管理。
 *
 * 权限判断在服务端做：没有 `user:read` 的用户根本进不到表格（渲染 403 视图），
 * 因此也不会去请求 `/api/admin/users`。表格里的按钮显隐只是「顺手」，
 * 每个操作后端都会再拦一次。
 */
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PERMISSIONS, hasPermission } from '@nnfs/shared';

import { UsersTable } from '@/components/admin/users-table';
import { ForbiddenView, LoadingBlock, PageTitle } from '@/components/ui';
import { requirePermissions } from '@/lib/server-session';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/users'>) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: 'admin' }))('usersTitle') };
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AdminUsersContent />
    </Suspense>
  );
}

async function AdminUsersContent() {
  const t = await getTranslations('admin');
  const profile = await requirePermissions([PERMISSIONS.USER_READ], '/admin/users');
  if (!profile) return <ForbiddenView />;

  return (
    <>
      <PageTitle title={t('usersTitle')} />
      <UsersTable
        canAssign={hasPermission(profile.permissions, PERMISSIONS.ROLE_ASSIGN)}
        canUpdate={hasPermission(profile.permissions, PERMISSIONS.USER_UPDATE)}
        canDelete={hasPermission(profile.permissions, PERMISSIONS.USER_DELETE)}
      />
    </>
  );
}
