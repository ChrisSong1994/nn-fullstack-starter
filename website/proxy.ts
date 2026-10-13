/**
 * Proxy（Next 16 起 middleware 改名为 proxy）：语言路由 + 乐观登录校验。
 *
 * 这里**只做 Cookie 存在性判断**，不查数据库 —— proxy 在每个请求（含预取）上都会跑，
 * 真正的权限判定放在页面里（见 lib/server-session.ts）。这也是官方推荐的
 * 「optimistic check + 页面内权威校验」两层结构。
 */
import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

/** better-auth 的会话 Cookie 名（cookiePrefix 为 nnfs）。 */
const SESSION_COOKIE = 'nnfs.session_token';

/** 需要登录才能访问的业务路径（不含语言前缀）。 */
const PROTECTED_PATHS = ['/dashboard', '/admin'];

/** 已登录时不该再看到的路由。 */
const GUEST_ONLY_PATHS = ['/login', '/register', '/forgot-password'];

/** 去掉语言前缀，得到业务路径；`/zh` -> `/`，`/en/login` -> `/login`。 */
function stripLocale(pathname: string): { locale: string; path: string } {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return { locale, path: '/' };
    if (pathname.startsWith(`/${locale}/`)) return { locale, path: pathname.slice(locale.length + 1) };
  }
  return { locale: routing.defaultLocale, path: pathname };
}

function matches(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest): NextResponse {
  const { locale, path } = stripLocale(request.nextUrl.pathname);
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && matches(path, PROTECTED_PATHS)) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    // 登录后跳回原页面（语言前缀由前端的路由自动补上）。
    loginUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && matches(path, GUEST_ONLY_PATHS)) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return handleI18nRouting(request) as NextResponse;
}

export const config = {
  // 跳过 /api（转发给后端）、静态资源、以及带扩展名的文件。
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
