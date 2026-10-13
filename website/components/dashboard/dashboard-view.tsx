'use client';

/**
 * 控制台内容。
 *
 * 数据由服务端页面读好（`/api/me`）后传进来 —— 这里只负责渲染，
 * 不再发请求，所以首屏不会出现「先空白再闪出数据」。
 */
import { Card, Col, Descriptions, Row, Space, Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { PERMISSION_CATALOG, type CurrentUserProfile } from '@nnfs/shared';

import { VerifyEmailBanner } from '@/components/auth/verify-email-banner';
import { SessionCard } from '@/components/dashboard/session-card';

export function DashboardView({ profile }: { profile: CurrentUserProfile }) {
  const t = useTranslations('dashboard');
  const tAuth = useTranslations('auth');
  const { user, roles, permissions } = profile;

  // 按 group 归类，只留当前用户真正拥有的权限点。
  const granted = PERMISSION_CATALOG.reduce<Record<string, string[]>>((groups, permission) => {
    if (!permissions.includes(permission.code)) return groups;
    (groups[permission.group] ??= []).push(permission.code);
    return groups;
  }, {});

  return (
    <Space orientation="vertical" size="large" className="w-full">
      <VerifyEmailBanner />

      <Typography.Title level={3} className="mt-0!">
        {t('welcome', { name: user.name })}
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title={t('profile')}>
            <Descriptions
              column={1}
              items={[
                {
                  key: 'id',
                  label: t('userId'),
                  children: <Typography.Text code>{user.id}</Typography.Text>,
                },
                { key: 'name', label: tAuth('name'), children: user.name },
                { key: 'email', label: tAuth('email'), children: user.email },
                {
                  key: 'emailVerified',
                  label: t('emailVerified'),
                  children: user.emailVerified ? (
                    <Tag color="green">{t('verified')}</Tag>
                  ) : (
                    <Tag color="orange">{t('unverified')}</Tag>
                  ),
                },
                {
                  key: 'roles',
                  label: t('roles'),
                  children:
                    roles.length > 0 ? (
                      <Space wrap>
                        {roles.map((role) => (
                          <Tag key={role} color="blue">
                            {role}
                          </Tag>
                        ))}
                      </Space>
                    ) : (
                      <Typography.Text type="secondary">—</Typography.Text>
                    ),
                },
                ...(user.banned
                  ? [
                      {
                        key: 'banned',
                        label: t('banned'),
                        children: <Tag color="red">{user.banReason ?? t('banned')}</Tag>,
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <SessionCard />
        </Col>
      </Row>

      <Card title={t('permissions')}>
        {permissions.length === 0 ? (
          <Typography.Text type="secondary">{t('noPermission')}</Typography.Text>
        ) : (
          <Space orientation="vertical" size="small" className="w-full">
            {Object.entries(granted).map(([group, codes]) => (
              <Space key={group} wrap>
                <Typography.Text type="secondary" className="w-20">
                  {group}
                </Typography.Text>
                {codes.map((code) => (
                  <Tag key={code} color="geekblue">
                    {code}
                  </Tag>
                ))}
              </Space>
            ))}
          </Space>
        )}
      </Card>
    </Space>
  );
}
