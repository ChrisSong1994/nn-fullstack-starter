/**
 * 每次请求的 i18n 配置：告诉 next-intl「这次用哪个语言、加载哪份文案」。
 *
 * 这里只做语言判定与文案加载；时区、格式统一交给 Intl，语言判定结果写入
 * `[locale]` 路由段（见 app/[locale]/layout.tsx 的 setRequestLocale）。
 */
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // 时间/日期在这套系统里都是服务端写入的 UTC，展示统一按 UTC 处理更不容易出错。
    timeZone: 'UTC',
  };
});
