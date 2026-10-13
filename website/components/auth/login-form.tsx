'use client';

/**
 * 登录表单。
 *
 * 校验分两层：antd 的 rules 负责即时反馈，提交前再用 packages/shared 的 zod schema
 * 过一遍 —— 与后端同一份规则（trim / 小写化 / 长度都一致），后端仍是唯一可信的校验方。
 */
import { App, Button, Checkbox, Form, Input, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PASSWORD_MIN_LENGTH, loginSchema } from '@nnfs/shared';

import { Link, useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';
import { useSessionStore } from '@/stores/session-store';

interface FormValues {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export function LoginForm({ redirectTo = '/dashboard' }: { redirectTo?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const { message } = App.useApp();
  const refresh = useSessionStore((state) => state.refresh);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: FormValues) => {
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      message.error(parsed.error.issues[0]?.message ?? t('error.unknown'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: parsed.data.rememberMe,
      });

      if (error) {
        message.error(error.message ?? t('error.unknown'));
        return;
      }

      // 登录只写了 Cookie，角色与权限点要重新向后端要一次。
      await refresh();
      message.success(t('auth.loginSuccess'));
      router.replace(redirectTo);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form<FormValues>
      layout="vertical"
      initialValues={{ rememberMe: false }}
      onFinish={handleSubmit}
      className="max-w-sm"
    >
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
        name="password"
        label={t('auth.password')}
        rules={[
          { required: true, message: t('auth.password') },
          { min: PASSWORD_MIN_LENGTH, message: t('auth.passwordHint') },
        ]}
      >
        <Input.Password autoComplete="current-password" size="large" />
      </Form.Item>

      <Form.Item name="rememberMe" valuePropName="checked">
        <Checkbox>{t('auth.rememberMe')}</Checkbox>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
          {t('auth.loginSubmit')}
        </Button>
      </Form.Item>

      <div className="flex justify-between gap-4">
        <Typography.Text type="secondary">
          {t('auth.noAccount')} <Link href="/register">{t('nav.register')}</Link>
        </Typography.Text>
        <Link href="/forgot-password">{t('auth.forgotLink')}</Link>
      </div>
    </Form>
  );
}
