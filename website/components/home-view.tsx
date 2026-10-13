'use client';

/**
 * 首页内容（客户端组件，因为用了 antd）。
 */
import { Button, Card, Col, Row, Space, Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export function HomeView() {
  const t = useTranslations('home');

  const features = [t('featureAuth'), t('featureRbac'), t('featureStack')];

  return (
    <Space orientation="vertical" size="large" className="w-full">
      <Space orientation="vertical" size="small">
        <Typography.Title level={2} className="mt-0!">
          {t('title')}
        </Typography.Title>
        <Typography.Paragraph type="secondary" className="max-w-2xl">
          {t('subtitle')}
        </Typography.Paragraph>
        <Space wrap>
          <Tag color="blue">Next.js 16</Tag>
          <Tag color="geekblue">NestJS</Tag>
          <Tag color="purple">Prisma</Tag>
          <Tag color="cyan">better-auth</Tag>
          <Tag color="gold">BullMQ</Tag>
        </Space>
      </Space>

      <Space wrap>
        <Link href="/dashboard">
          <Button type="primary" size="large">
            {t('ctaDashboard')}
          </Button>
        </Link>
        <Link href="/login">
          <Button size="large">{t('ctaLogin')}</Button>
        </Link>
      </Space>

      <Row gutter={[16, 16]}>
        {features.map((feature) => (
          <Col key={feature} xs={24} md={8}>
            <Card className="h-full">
              <Typography.Text>{feature}</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}
