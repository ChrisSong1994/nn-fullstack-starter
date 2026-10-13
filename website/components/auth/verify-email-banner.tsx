'use client';

/**
 * 「邮箱未验证」提示条。
 *
 * 只有未验证时才出现，点一下重新发验证邮件（链接回到 /verify-email）。
 */
import { Alert, Button, Space } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client';
import { useSessionStore } from '@/stores/session-store';

export function VerifyEmailBanner() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const user = useSessionStore((state) => state.user);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!user || user.emailVerified) return null;

  const handleSend = async () => {
    setSending(true);
    try {
      // callbackURL 用带语言前缀的地址，邮件里点回来才不会丢语言。
      await authClient.sendVerificationEmail({
        email: user.email,
        callbackURL: `/${locale}/verify-email`,
      });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <Alert
      type="warning"
      showIcon
      message={sent ? t('verifySent') : t('verifyBanner')}
      action={
        <Space>
          <Button size="small" loading={sending} disabled={sent} onClick={handleSend}>
            {t('verifySend')}
          </Button>
        </Space>
      }
    />
  );
}
