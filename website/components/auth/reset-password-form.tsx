'use client';

/**
 * 重置密码表单。
 *
 * token 由页面从 `?token=` 读出来传进来（服务端读 searchParams，
 * 客户端组件不碰 useSearchParams，省掉一层 Suspense 边界）。
 * 校验通过后 better-auth 会顺便把用户登录上，所以这里直接 refreshed 会话。
 */
import { App, Button, Form, Input, Result } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PASSWORD_MIN_LENGTH, resetPasswordSchema } from '@nnfs/shared';

import { Link, useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';

interface FormValues {
  password: string;
  passwordConfirm: string;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Result
        status="error"
        title={t('auth.verifyFailed')}
        extra={
          <Link href="/forgot-password">
            <Button type="primary">{t('auth.forgotTitle')}</Button>
          </Link>
        }
      />
    );
  }

  const handleSubmit = async (values: FormValues) => {
    const parsed = resetPasswordSchema.safeParse({ token, password: values.password });
    if (!parsed.success) {
      message.error(parsed.error.issues[0]?.message ?? t('error.unknown'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: parsed.data.password,
        token: parsed.data.token,
      });
      if (error) {
        message.error(error.message ?? t('auth.verifyFailed'));
        return;
      }
      setDone(true);
      message.success(t('auth.resetSuccess'));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Result
        status="success"
        title={t('auth.resetSuccess')}
        extra={
          <Button type="primary" onClick={() => router.replace('/login')}>
            {t('nav.login')}
          </Button>
        }
      />
    );
  }

  return (
    <Form<FormValues> layout="vertical" onFinish={handleSubmit} className="max-w-sm">
      <Form.Item
        name="password"
        label={t('auth.newPassword')}
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
          {t('auth.resetSubmit')}
        </Button>
      </Form.Item>
    </Form>
  );
}
