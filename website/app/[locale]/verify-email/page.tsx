/**
 * 邮箱验证结果页。
 *
 * 邮件里的链接形如 `/zh/verify-email?token=...`，token 交给客户端组件去调
 * better-auth 的 verify-email 接口（后端开了 autoSignInAfterVerification，
 * 验证通过即登录）。和重置密码页一样，页面只把 searchParams 递下去，保持外壳静态。
 */
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { AuthCard } from '@/components/auth/auth-card';
import { VerifyEmailView } from '@/components/auth/verify-email-view';
import { LoadingCard } from '@/components/ui';

export async function generateMetadata({ params }: PageProps<'/[locale]/verify-email'>) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: 'auth' }))('verifyTitle') };
}

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<'/[locale]/verify-email'>) {
  const t = await getTranslations('auth');

  return (
    <AuthCard title={t('verifyTitle')}>
      <Suspense fallback={<LoadingCard />}>
        <VerifyEmailContent searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function VerifyEmailContent({
  searchParams,
}: Pick<PageProps<'/[locale]/verify-email'>, 'searchParams'>) {
  const { token } = await searchParams;
  return <VerifyEmailView token={typeof token === 'string' ? token : ''} />;
}
