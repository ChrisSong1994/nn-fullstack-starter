/**
 * 找回密码页。
 */
import { getTranslations } from 'next-intl/server';

import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export async function generateMetadata({ params }: PageProps<'/[locale]/forgot-password'>) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: 'auth' }))('forgotTitle') };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations('auth');

  return (
    <AuthCard title={t('forgotTitle')} subtitle={t('forgotSubtitle')}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}
