'use client';

/**
 * antd 的 Provider：主题 + 语言 + `App` 容器。
 *
 * `App`（antd 的）提供 message / notification / modal 的上下文，
 * 组件里用 `App.useApp()` 拿，避免静态方法带来的主题丢失问题。
 */
import { App as AntdApp, ConfigProvider, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useLocale } from 'next-intl';

const ANTD_LOCALES = {
  zh: zhCN,
  en: enUS,
} as const;

export function AntdProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();

  return (
    <ConfigProvider
      locale={ANTD_LOCALES[locale as keyof typeof ANTD_LOCALES] ?? zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
