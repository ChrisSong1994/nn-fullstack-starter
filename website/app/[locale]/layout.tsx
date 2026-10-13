/**
 * 根布局（`app/[locale]/layout.tsx`）。
 *
 * 全站都在 `[locale]` 段下，所以 html/body 就写在这里 —— 没有 app/layout.tsx。
 * 这一层负责：语言（html lang + next-intl provider）、antd 的 SSR 样式注册表、
 * 会话数据、全局导航外壳。
 */
import { AntdRegistry } from '@ant-design/nextjs-registry';
import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { AntdProvider } from '@/components/antd-provider';
import { SessionProvider } from '@/components/session-provider';
import { routing } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/server-session';

import '../globals.css';

/**
 * 会话相关的页面（登录态、后台）本质上都是动态的，没有「即时导航」可言。
 * cacheComponents 下显式关掉 instant 校验，避免每次改导航都要补 Suspense 边界。
 */
export const instant = false;

export const metadata: Metadata = {
  title: {
    default: 'nnfs · 全栈模板',
    template: '%s · nnfs',
  },
  description: 'Next.js + NestJS 全栈模板：邮箱认证与角色权限（RBAC）',
};

/** 两种语言在构建时就确定下来，让 `[locale]` 成为可静态化的根参数。 */
export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // 让本层及其子树用静态渲染（next-intl 的根参数约定）。
  setRequestLocale(locale);

  // 服务端读一次会话：首屏就知道用户是谁，客户端 store 也就不会有登录态闪烁。
  const profile = await getCurrentUser();

  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <AntdRegistry>
          <NextIntlClientProvider>
            <AntdProvider>
              <SessionProvider profile={profile}>
                <AppShell>{children}</AppShell>
              </SessionProvider>
            </AntdProvider>
          </NextIntlClientProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
