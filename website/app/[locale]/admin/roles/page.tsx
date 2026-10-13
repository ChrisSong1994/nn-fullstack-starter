/**
 * 后台 · 角色与权限。
 *
 * 和用户管理一样：没有 `role:read` 就直接渲染 403 视图。
 */
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PERMISSIONS, hasPermission } from '@nnfs/shared';

import { RolesTable } from '@/components/admin/roles-table';
import { ForbiddenView, LoadingBlock, PageTitle } from '@/components/ui';
import { requirePermissions } from '@/lib/server-session';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/roles'>) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: 'admin' }))('rolesTitle') };
}

export default function AdminRolesPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AdminRolesContent />
    </Suspense>
  );
}

async function AdminRolesContent() {
  const t = await getTranslations('admin');
  const profile = await requirePermissions([PERMISSIONS.ROLE_READ], '/admin/roles');
  if (!profile) return <ForbiddenView />;

  return (
    <>
      <PageTitle title={t('rolesTitle')} />
      <RolesTable
        canCreate={hasPermission(profile.permissions, PERMISSIONS.ROLE_CREATE)}
        canUpdate={hasPermission(profile.permissions, PERMISSIONS.ROLE_UPDATE)}
        canDelete={hasPermission(profile.permissions, PERMISSIONS.ROLE_DELETE)}
      />
    </>
  );
}
