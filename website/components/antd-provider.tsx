'use client';

/**
 * antd 的 Provider：主题 + 语言 + `App` 容器。
 *
 * `App`（antd 的）提供 message / notification / modal 的上下文，
 * 组件里用 `App.useApp()` 拿，避免静态方法带来的主题丢失问题。
 *
 * 深色走 `theme.darkAlgorithm`，明暗取自 ThemeProvider —— 与 <html> 上的 `dark` 类
 * （我们自己写的样式看它）用的是同一份状态，两套主题不会各走各的。
 */
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useLocale } from 'next-intl';

import { useTheme } from '@/components/theme-provider';
import type { ResolvedTheme } from '@/lib/theme';

const ANTD_LOCALES = {
  zh: zhCN,
  en: enUS,
} as const;

/**
 * 顶栏底色。antd 的 Layout.Header 默认是固定的深蓝 `#001529`，浅色下太惹眼、深色下
 * 太扎眼，这里改成跟着主题走（深色用 antd 的容器色 colorBgContainer）。
 */
const HEADER_BG: Record<ResolvedTheme, string> = {
  light: '#ffffff',
  dark: '#141414',
};

export function AntdProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const { resolved } = useTheme();

  return (
    <ConfigProvider
      locale={ANTD_LOCALES[locale as keyof typeof ANTD_LOCALES] ?? zhCN}
      theme={{
        algorithm: resolved === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
        components: {
          Layout: { headerBg: HEADER_BG[resolved] },
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
