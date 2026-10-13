'use client';

/**
 * 邮箱验证结果页。
 *
 * token 从 `?token=` 来（页面服务端读取后传入）。挂载时调一次 verifyEmail 接口，
 * 后端开了 autoSignInAfterVerification，验证成功后直接就是登录态。
 */
import { Button, Result, Spin } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';
import { useSessionStore } from '@/stores/session-store';

type Status = 'pending' | 'success' | 'failed';

export function VerifyEmailView({ token }: { token: string }) {
  const t = useTranslations();
  const router = useRouter();
  const refresh = useSessionStore((state) => state.refresh);
  const [status, setStatus] = useState<Status>(token ? 'pending' : 'failed');
  // React 18/19 开发模式会跑两次 effect，用 ref 挡住重复请求（token 是一次性的）。
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;

    void (async () => {
      const { error } = await authClient.verifyEmail({ query: { token } });
      if (error) {
        setStatus('failed');
        return;
      }
      setStatus('success');
      await refresh();
    })();
  }, [token, refresh]);

  if (status === 'pending') {
    return (
      <Result
        icon={<Spin size="large" />}
        title={t('auth.verifyPending')}
        subTitle={t('common.loading')}
      />
    );
  }

  if (status === 'failed') {
    return (
      <Result
        status="error"
        title={t('auth.verifyFailed')}
        extra={
          <Link href="/login">
            <Button type="primary">{t('common.goToLogin')}</Button>
          </Link>
        }
      />
    );
  }

  return (
    <Result
      status="success"
      title={t('auth.verifySuccess')}
      extra={
        <Button
          type="primary"
          onClick={() => {
            router.replace('/dashboard');
            router.refresh();
          }}
        >
          {t('home.ctaDashboard')}
        </Button>
      }
    />
  );
}
