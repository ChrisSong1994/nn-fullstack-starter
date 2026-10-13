'use client';

/**
 * 认证页面（登录 / 注册 / 找回密码…）共用的居中卡片外壳。
 *
 * 是个客户端组件：**antd 组件只在客户端组件里用**（见下方说明）。
 */
import { Card, Space, Typography } from 'antd';

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <Space orientation="vertical" size="small" className="mb-4 w-full">
          <Typography.Title level={3} className="mt-0! mb-0!">
            {title}
          </Typography.Title>
          {subtitle ? <Typography.Text type="secondary">{subtitle}</Typography.Text> : null}
        </Space>
        {children}
        {footer}
      </Card>
    </div>
  );
}
