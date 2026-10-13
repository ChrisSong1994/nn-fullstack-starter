'use client';

/**
 * 找回密码表单。
 *
 * 无论邮箱是否注册过都提示「已发送」，避免暴露账号是否存在（后端也是这么做的）。
 */
import { App, Button, Form, Input, Result, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { forgotPasswordSchema } from '@nnfs/shared';

import { Link } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';

interface FormValues {
  email: string;
}

export function ForgotPasswordForm() {
  const t = useTranslations();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (values: FormValues) => {
    const parsed = forgotPasswordSchema.safeParse(values);
    if (!parsed.success) {
      message.error(parsed.error.issues[0]?.message ?? t('error.unknown'));
      return;
    }

    setSubmitting(true);
    try {
      // redirectTo 指向本站的重置页，邮件里的链接会带回 token（?token=...）。
      const { error } = await authClient.requestPasswordReset({
        email: parsed.data.email,
        redirectTo: '/reset-password',
      });
      if (error) {
        message.error(error.message ?? t('error.unknown'));
        return;
      }
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <Result
        status="success"
        title={t('auth.forgotSent')}
        extra={
          <Link href="/login">
            <Button type="primary">{t('common.goToLogin')}</Button>
          </Link>
        }
      />
    );
  }

  return (
    <Form<FormValues> layout="vertical" onFinish={handleSubmit} className="max-w-sm">
      <Form.Item
        name="email"
        label={t('auth.email')}
        rules={[
          { required: true, message: t('auth.email') },
          { type: 'email', message: t('auth.email') },
        ]}
      >
        <Input autoComplete="email" size="large" placeholder="you@example.com" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
          {t('auth.forgotSubmit')}
        </Button>
      </Form.Item>

      <Typography.Text type="secondary">
        {t('auth.hasAccount')} <Link href="/login">{t('nav.login')}</Link>
      </Typography.Text>
    </Form>
  );
}
