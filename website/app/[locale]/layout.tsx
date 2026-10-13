/**
 * 根布局（`app/[locale]/layout.tsx`）。
 *
 * 全站都在 `[locale]` 段下，所以 html/body 就写在这里 —— 没有 app/layout.tsx。
 * 这一层负责：语言（html lang + next-intl provider）、主题（明暗类 + provider）、
 * antd 的 SSR 样式注册表、会话数据、全局导航外壳。
 */
import { AntdRegistry } from '@ant-design/nextjs-registry';
import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';

import { AppShell } from '@/components/app-shell';
import { AntdProvider } from '@/components/antd-provider';
import { SessionProvider } from '@/components/session-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { routing } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/server-session';
import { parseThemeMode, THEME_COOKIE, THEME_INIT_SCRIPT } from '@/lib/theme';

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

/** 两种语言在构建时就确定下来，对应的 `[locale]` 成为可静态化的根参数。 */
export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // 会话与主题互不依赖，并行读取。
  // 会话交给客户端 store 打底，首屏就知道用户是谁，不会有登录态闪烁；
  // 主题偏好存在 Cookie 里，服务端能读到时首帧就是正确的明暗（见 lib/theme.ts）。
  const [profile, themeMode] = await Promise.all([
    getCurrentUser(),
    cookies().then((store) => parseThemeMode(store.get(THEME_COOKIE)?.value)),
  ]);

  // 「跟随系统」服务端无从得知，先按浅色渲染，剩下的交给下面的初始化脚本。
  const isDark = themeMode === 'dark';

  return (
    <html
      lang={locale}
      className={isDark ? 'dark' : undefined}
      style={{ colorScheme: isDark ? 'dark' : 'light' }}
      // 初始化脚本会在水合之前动 <html> 的类，React 不必（也没法）纠正它。
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        {/* 首帧之前定好明暗，避免整页「先浅后深」闪一下（见 lib/theme.ts）。 */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <AntdRegistry>
          <NextIntlClientProvider>
            <ThemeProvider initialMode={themeMode}>
              <AntdProvider>
                <SessionProvider profile={profile}>
                  <AppShell>{children}</AppShell>
                </SessionProvider>
              </AntdProvider>
            </ThemeProvider>
          </NextIntlClientProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
