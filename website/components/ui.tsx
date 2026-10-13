'use client';

/**
 * 客户端专供的小组件集合。
 *
 * 为什么这些小东西也要 `'use client'`：antd 的组件在 RSC 里是「客户端引用」，
 * 直接在服务端组件里写 `<Typography.Title>`（复合组件）会拿到 undefined 并报
 * 「Element type is invalid」。所以本项目约定：**antd 只在客户端组件里出现**，
 * 服务端组件负责取数据，再把结果作为 props 交给这些客户端组件渲染。
 */
import { Button, Card, Result, Skeleton, Spin, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

/** 页面标题。 */
export function PageTitle({ title }: { title: string }) {
  return (
    <Typography.Title level={3} className="mt-0!">
      {title}
    </Typography.Title>
  );
}

/** 卡片里的加载态（认证类页面的 Suspense fallback）。 */
export function LoadingCard() {
  return (
    <Card variant="borderless">
      <Spin />
    </Card>
  );
}

/** 整页加载态（后台等重页面的 Suspense fallback）。 */
export function LoadingBlock() {
  return <Skeleton active paragraph={{ rows: 8 }} />;
}

/** 403 视图：服务端判定权限不足时渲染它。 */
export function ForbiddenView() {
  const t = useTranslations('error');
  const tCommon = useTranslations('common');

  return (
    <Result
      status="403"
      title={t('forbidden')}
      subTitle={t('forbiddenHint')}
      extra={
        <Link href="/dashboard">
          <Button type="primary">{tCommon('backHome')}</Button>
        </Link>
      }
    />
  );
}

/** 404 视图。 */
export function NotFoundView() {
  const t = useTranslations('common');

  return (
    <Result
      status="404"
      title="404"
      subTitle={t('notFound')}
      extra={
        <Link href="/">
          <Button type="primary">{t('backHome')}</Button>
        </Link>
      }
    />
  );
}
