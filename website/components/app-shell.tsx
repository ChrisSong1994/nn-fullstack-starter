'use client';

/**
 * 全站外壳：顶部导航 + 主题/语言切换 + 用户菜单。
 *
 * 菜单项按权限点过滤（`can` / `canAny`），后端同样会拦 —— 这里只解决「看不见」的问题。
 */
import { App, Avatar, Button, Dropdown, Layout, Menu, Segmented, Space, Tag, Typography } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { PERMISSIONS, type PermissionCode } from '@nnfs/shared';

import { ThemeToggle } from '@/components/theme-toggle';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { authClient } from '@/lib/auth-client';
import { useSessionStore } from '@/stores/session-store';

const { Header, Content, Footer } = Layout;

interface NavItem {
  key: string;
  labelKey: string;
  /** 需要的权限点（任意一个命中即可显示）。 */
  anyOf?: readonly PermissionCode[];
}

const NAV_ITEMS: NavItem[] = [
  { key: '/', labelKey: 'nav.home' },
  { key: '/dashboard', labelKey: 'nav.dashboard' },
  { key: '/admin/users', labelKey: 'nav.users', anyOf: [PERMISSIONS.USER_READ] },
  { key: '/admin/roles', labelKey: 'nav.roles', anyOf: [PERMISSIONS.ROLE_READ] },
  { key: '/admin/logs', labelKey: 'nav.logs', anyOf: [PERMISSIONS.LOG_READ] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { message } = App.useApp();

  const user = useSessionStore((state) => state.user);
  const roles = useSessionStore((state) => state.roles);
  const loaded = useSessionStore((state) => state.loaded);
  const setProfile = useSessionStore((state) => state.setProfile);
  const canAny = useSessionStore((state) => state.canAny);

  const [signingOut, setSigningOut] = useState(false);

  const items = useMemo(
    () =>
      NAV_ITEMS.filter((item) => !item.anyOf || canAny(item.anyOf)).map((item) => ({
        key: item.key,
        label: <Link href={item.key}>{t(item.labelKey)}</Link>,
      })),
    [canAny, t],
  );

  // 子路径（如 /admin/users/123）也高亮父级菜单。
  const selectedKey =
    NAV_ITEMS.filter((item) => item.key !== '/' && pathname.startsWith(item.key))
      .map((item) => item.key)
      .at(0) ?? pathname;

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        message.error(error.message ?? t('error.unknown'));
        return;
      }
      setProfile(null);
      message.success(t('auth.logoutSuccess'));
      router.replace('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Layout className="min-h-screen">
      {/* 底色（含深色）由 antd 的 Layout.headerBg 给，见 components/antd-provider.tsx。 */}
      <Header className="flex items-center gap-6 px-6 shadow-sm!">
        <Link href="/" className="text-lg font-semibold whitespace-nowrap">
          {t('common.appName')}
        </Link>
        <Menu
          mode="horizontal"
          items={items}
          selectedKeys={[selectedKey]}
          className="flex-1 border-b-0! bg-transparent!"
        />
        <Space size="middle">
          <Segmented
            size="small"
            value={locale}
            aria-label={t('nav.language')}
            options={routing.locales.map((item) => ({ label: item.toUpperCase(), value: item }))}
            onChange={(value) => router.replace(pathname, { locale: value as string })}
          />
          <ThemeToggle />
          {loaded && user ? (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'dashboard',
                    label: <Link href="/dashboard">{t('nav.dashboard')}</Link>,
                  },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    label: t('nav.logout'),
                    danger: true,
                    disabled: signingOut,
                    onClick: handleSignOut,
                  },
                ],
              }}
            >
              <Space className="cursor-pointer" size="small">
                <Avatar size="small" src={user.image ?? undefined}>
                  {user.name.slice(0, 1).toUpperCase()}
                </Avatar>
                <Typography.Text className="hidden sm:inline">{user.name}</Typography.Text>
              </Space>
            </Dropdown>
          ) : loaded ? (
            <Space size="small">
              <Link href="/login">
                <Button size="small">{t('nav.login')}</Button>
              </Link>
              <Link href="/register">
                <Button size="small" type="primary">
                  {t('nav.register')}
                </Button>
              </Link>
            </Space>
          ) : null}
        </Space>
      </Header>

      <Content className="mx-auto w-full max-w-6xl px-6 py-8">{children}</Content>

      <Footer className="text-center">
        <Space size="small">
          <Typography.Text type="secondary">{t('common.appTagline')}</Typography.Text>
          {roles.length > 0 ? (
            <Tag color="blue">{roles.join(' · ')}</Tag>
          ) : null}
        </Space>
      </Footer>
    </Layout>
  );
}
