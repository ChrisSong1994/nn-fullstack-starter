/**
 * 服务端会话读取。
 *
 * 前端不直接连数据库，也不重复实现鉴权逻辑 —— 它把浏览器带来的 Cookie 原样转给
 * 后端 `/api/me`，由后端算出角色与权限点。这样「前端能不能看到」与「后端让不让做」
 * 用的是同一份判断。
 */
import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasAnyPermission, type CurrentUserProfile, type PermissionCode } from '@nnfs/shared';

/** 服务端访问后端的地址（浏览器侧走 next.config.ts 的 rewrites，不经过这里）。 */
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:5050';

/** 读取当前登录用户；未登录或会话失效返回 null。 */
export async function getCurrentUser(): Promise<CurrentUserProfile | null> {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) return null;

  const response = await fetch(`${BACKEND_URL}/api/me`, {
    headers: { cookie: cookieHeader },
    // 会话相关数据永远不能进缓存。
    cache: 'no-store',
  });

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`读取当前用户失败：${response.status} ${response.statusText}`);
  }

  return (await response.json()) as CurrentUserProfile;
}

/**
 * 页面级权限判定：未登录跳登录页，权限不足返回 null（由页面渲染 403 视图）。
 *
 * 注意这不只是「隐藏按钮」：页面数据本身也是在这个判断之后才去请求后端，
 * 未授权用户根本拿不到数据。
 */
export async function requirePermissions(
  permissions: readonly PermissionCode[],
  redirectTo: string,
): Promise<CurrentUserProfile | null> {
  const profile = await getCurrentUser();
  if (!profile) {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }
  if (!hasAnyPermission(profile.permissions, permissions)) return null;
  return profile;
}
