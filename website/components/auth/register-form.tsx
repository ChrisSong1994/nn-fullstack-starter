'use client';

/**
 * 注册表单。
 *
 * 注册成功后 better-auth 会直接签发会话（除非后端开了「必须验证邮箱」）；
 * 如果没拿到会话，说明需要先验证邮箱，这里给出提示并引导到登录页。
 */
import { App, Button, Form, Input, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PASSWORD_MIN_LENGTH, registerSchema } from '@nnfs/shared';

import { Link, useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';
import { useSessionStore } from '@/stores/session-store';

interface FormValues {
  email: string;
  name: string;
  password: string;
  passwordConfirm: string;
}

export function RegisterForm() {
  const t = useTranslations();
  const router = useRouter();
  const { message } = App.useApp();
  const refresh = useSessionStore((state) => state.refresh);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: FormValues) => {
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      message.error(parsed.error.issues[0]?.message ?? t('error.unknown'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await authClient.signUp.email(parsed.data);
      if (error) {
        message.error(error.message ?? t('error.unknown'));
        return;
      }

      const profile = await refresh();
      if (!profile) {
        // 开了邮箱验证时注册不会直接登录。
        message.success(t('auth.forgotSent'));
        router.replace('/login');
        return;
      }

      message.success(t('auth.registerSuccess'));
      router.replace('/dashboard');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

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

      <Form.Item
        name="name"
        label={t('auth.name')}
        rules={[{ required: true, message: t('auth.name') }, { max: 32 }]}
      >
        <Input autoComplete="nickname" size="large" />
      </Form.Item>

      <Form.Item
        name="password"
        label={t('auth.password')}
        extra={t('auth.passwordHint')}
        rules={[
          { required: true, message: t('auth.password') },
          { min: PASSWORD_MIN_LENGTH, message: t('auth.passwordHint') },
        ]}
      >
        <Input.Password autoComplete="new-password" size="large" />
      </Form.Item>

      <Form.Item
        name="passwordConfirm"
        label={t('auth.passwordConfirm')}
        dependencies={['password']}
        rules={[
          { required: true, message: t('auth.passwordConfirm') },
          ({ getFieldValue }) => ({
            validator: (_rule, value) =>
              !value || getFieldValue('password') === value
                ? Promise.resolve()
                : Promise.reject(new Error(t('auth.passwordConfirm'))),
          }),
        ]}
      >
        <Input.Password autoComplete="new-password" size="large" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
          {t('auth.registerSubmit')}
        </Button>
      </Form.Item>

      <Typography.Text type="secondary">
        {t('auth.hasAccount')} <Link href="/login">{t('nav.login')}</Link>
      </Typography.Text>
    </Form>
  );
}
