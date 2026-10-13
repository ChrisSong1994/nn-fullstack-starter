/**
 * 注册页。
 */
import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from '@/components/auth/register-form';

export async function generateMetadata({ params }: PageProps<'/[locale]/register'>) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: 'auth' }))('registerTitle') };
}

export default async function RegisterPage() {
  const t = await getTranslations('auth');

  return (
    <AuthCard title={t('registerTitle')} subtitle={t('registerSubtitle')}>
      <RegisterForm />
    </AuthCard>
  );
}
