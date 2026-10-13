import { defineRouting } from 'next-intl/routing';

/**
 * 语言路由配置。
 *
 * `localePrefix: 'always'`：所有页面都带语言前缀（/zh/login、/en/login），
 * 好处是「当前语言」永远能从 URL 读出来 —— 服务端渲染、分享链接、缓存都不会歧义。
 */
export const routing = defineRouting({
  locales: ['zh', 'en'],
  defaultLocale: 'zh',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
