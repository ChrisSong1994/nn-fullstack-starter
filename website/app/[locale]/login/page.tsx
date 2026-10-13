/**
 * 登录页。
 *
 * 静态页面：已登录用户由 proxy.ts 在到达这里之前就重定向走了。
 */
import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';

export async function generateMetadata({ params }: PageProps<'/[locale]/login'>) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: 'auth' }))('loginTitle') };
}

export default async function LoginPage() {
  const t = await getTranslations('auth');

  return (
    <AuthCard title={t('loginTitle')} subtitle={t('loginSubtitle')}>
      <LoginForm />
    </AuthCard>
  );
}
