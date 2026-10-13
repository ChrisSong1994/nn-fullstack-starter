/**
 * 控制台。
 *
 * 服务端先确认登录态（没登录直接跳登录页），再用 `/api/me` 的结果渲染 ——
 * 角色与权限点都是后端算好的，前端不做二次推导。
 */
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { DashboardView } from '@/components/dashboard/dashboard-view';
import { ForbiddenView, LoadingBlock } from '@/components/ui';
import { requirePermissions } from '@/lib/server-session';

export async function generateMetadata({ params }: PageProps<'/[locale]/dashboard'>) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: 'dashboard' }))('title') };
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  // 空权限集合 = 只要登录就行；未登录在这里被重定向到登录页。
  const profile = await requirePermissions([], '/dashboard');
  if (!profile) return <ForbiddenView />;

  return <DashboardView profile={profile} />;
}
