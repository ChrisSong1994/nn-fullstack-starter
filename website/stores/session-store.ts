/**
 * 会话与权限的客户端状态（zustand）。
 *
 * 定位：**渲染用的缓存**，不是权限来源。数据来自后端 `/api/me`，页面级访问控制
 * 由服务端做（lib/server-session.ts），这里的 `can()` 只用来决定「按钮显不显示」。
 */
import { hasAnyPermission, hasPermission, type CurrentUserProfile, type PermissionCode } from '@nnfs/shared';
import { create } from 'zustand';

import { apiFetch } from '@/lib/api-client';

interface SessionState {
  user: CurrentUserProfile['user'] | null;
  roles: string[];
  permissions: PermissionCode[];
  /** 是否已经拿到过一次会话结果（避免首屏闪烁）。 */
  loaded: boolean;
  /** 用服务端渲染时的数据初始化 / 更新。 */
  setProfile: (profile: CurrentUserProfile | null) => void;
  /** 重新拉取 `/api/me`（登录、退出、改角色后调用）。 */
  refresh: () => Promise<CurrentUserProfile | null>;
  /** 是否拥有某个权限点（数组 = 需要全部拥有）。 */
  can: (required: PermissionCode | readonly PermissionCode[]) => boolean;
  /** 是否拥有其中任意一个权限点（用于「有其一即可」的菜单项）。 */
  canAny: (candidates: readonly PermissionCode[]) => boolean;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: null,
  roles: [],
  permissions: [],
  loaded: false,

  setProfile: (profile) =>
    set({
      user: profile?.user ?? null,
      roles: profile?.roles ?? [],
      permissions: profile?.permissions ?? [],
      loaded: true,
    }),

  refresh: async () => {
    try {
      const profile = await apiFetch<CurrentUserProfile>('/api/me');
      get().setProfile(profile);
      return profile;
    } catch {
      // 401（未登录）与网络异常都按「未登录」处理，页面本身会再兜一层。
      get().setProfile(null);
      return null;
    }
  },

  can: (required) => {
    const { permissions } = get();
    // 用 `typeof === 'string'` 收窄：Array.isArray 对 `readonly T[]` 收不窄，
    // 单元素分支会留在联合类型里过不了编译。
    return typeof required === 'string'
      ? hasPermission(permissions, required)
      : required.every((code) => hasPermission(permissions, code));
  },

  canAny: (candidates) => hasAnyPermission(get().permissions, candidates),
}));
