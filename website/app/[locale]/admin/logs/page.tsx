/**
 * 后台 · 系统控制台（日志查看）。
 *
 * 权限判断在服务端做：没有 `log:read` 的用户只看到 403 视图，不会去请求
 * `/api/admin/logs/*`（日志里可能有邮箱等个人信息，接口那边同样会再拦一次）。
 * `canClear` 决定「清空」按钮出不出现 —— 清空是不可逆操作，默认只有超管有 `log:clear`。
 */
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { PERMISSIONS, hasPermission } from '@nnfs/shared';

import { LogsViewer } from '@/components/admin/logs-viewer';
import { ForbiddenView, LoadingBlock, PageTitle } from '@/components/ui';
import { requirePermissions } from '@/lib/server-session';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/logs'>) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: 'admin' }))('logsTitle') };
}

export default function AdminLogsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <AdminLogsContent />
    </Suspense>
  );
}

async function AdminLogsContent() {
  const t = await getTranslations('admin');
  const profile = await requirePermissions([PERMISSIONS.LOG_READ], '/admin/logs');
  if (!profile) return <ForbiddenView />;

  return (
    <>
      <PageTitle title={t('logsTitle')} />
      <LogsViewer canClear={hasPermission(profile.permissions, PERMISSIONS.LOG_CLEAR)} />
    </>
  );
}
