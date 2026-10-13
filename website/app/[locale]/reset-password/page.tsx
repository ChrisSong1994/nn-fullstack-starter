/**
 * 重置密码页。
 *
 * `?token=` 是邮件链接带过来的。读 searchParams 属于动态数据，所以包一层
 * Suspense：静态外壳先把卡片渲染出来，token 解析完再换成表单。
 * 注意页面本身**不 await** searchParams，只是把 promise 递下去 —— 外壳才能静态化。
 */
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { LoadingCard } from '@/components/ui';

export async function generateMetadata({ params }: PageProps<'/[locale]/reset-password'>) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: 'auth' }))('resetTitle') };
}

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<'/[locale]/reset-password'>) {
  const t = await getTranslations('auth');

  return (
    <AuthCard title={t('resetTitle')} subtitle={t('resetSubtitle')}>
      <Suspense fallback={<LoadingCard />}>
        <ResetPasswordContent searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function ResetPasswordContent({
  searchParams,
}: Pick<PageProps<'/[locale]/reset-password'>, 'searchParams'>) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === 'string' ? token : ''} />;
}
