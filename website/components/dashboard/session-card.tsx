'use client';

/**
 * 会话信息卡片。
 *
 * 走 better-auth 的 `useSession`（而不是 /api/me）是为了顺带验证客户端 SDK 与
 * Cookie 缓存都通 —— 数据来自 `/api/auth/get-session`。
 */
import { Card, Descriptions, Skeleton, Tag } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';

import { authClient } from '@/lib/auth-client';

export function SessionCard() {
  const t = useTranslations('dashboard');
  const format = useFormatter();
  const { data, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <Card title={t('sessionTitle')}>
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    );
  }

  if (!data?.session) return null;

  const { session } = data;

  return (
    <Card title={t('sessionTitle')}>
      <Descriptions
        column={1}
        size="small"
        items={[
          {
            key: 'expiresAt',
            label: t('sessionExpires'),
            children: format.dateTime(new Date(session.expiresAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          },
          {
            key: 'ipAddress',
            label: 'IP',
            children: session.ipAddress ? <Tag>{session.ipAddress}</Tag> : '—',
          },
        ]}
      />
    </Card>
  );
}
