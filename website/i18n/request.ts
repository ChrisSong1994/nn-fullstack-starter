/**
 * 每次请求的 i18n 配置：告诉 next-intl「这次用哪个语言、加载哪份文案」。
 *
 * 语言取自 `[locale]` 根参数（`next/root-params`）：它是模块级 getter，任何服务端
 * 组件 / 服务端工具都能直接调用，静态渲染（cacheComponents / PPR）下照样能读，
 * 并且只把 `[locale]` 计入缓存键。
 *
 * 旧写法是 `getRequestConfig` 的 `requestLocale`：它先看 `setRequestLocale` 塞进
 * React cache 的值（该 API 在 next-intl 4.14 已废弃），取不到就退回读 `headers()`
 * （中间件塞的 `X-NEXT-INTL-LOCALE`）—— 后者会让整条路由转成动态渲染。
 *
 * 这里只做语言判定与文案加载；时区、格式统一交给 Intl。
 */
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import * as rootParams from 'next/root-params';

import { routing } from './routing';

export default getRequestConfig(async () => {
  const requested = await rootParams.locale();
  // 认不出的语言退回默认语言（不认识的 [locale] 段由 proxy 的中间件先拦掉）。
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // 时间/日期在这套系统里都是服务端写入的 UTC，展示统一按 UTC 处理更不容易出错。
    timeZone: 'UTC',
  };
});
