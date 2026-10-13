/**
 * 与后端会话相关的共享类型。
 */
import type { PermissionCode } from '../constants/permissions.js';

/**
 * better-auth 的 user 对象（会话里拿到的那个）。
 *
 * `role` 是 better-auth admin 插件的字段，多角色时用逗号分隔（如 `admin,user`），
 * 所以不要直接当单个角色用，统一走 `parseRoleList`。
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  role: string;
  banned?: boolean | null;
  banReason?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * `GET /api/me` 的返回：会话用户 + 展开后的角色名与权限点。
 *
 * 前端的权限 store 只依赖这一个接口，登录/刷新后拉一次就够了；
 * 权限点由后端从数据库算出来，前端不做二次推导。
 */
export interface CurrentUserProfile {
  user: AuthUser;
  /** 展开后的角色名列表。 */
  roles: string[];
  /** 展开后的权限点，例如 `['user:read', 'role:assign']`。 */
  permissions: PermissionCode[];
}

/** 把 better-auth 的逗号分隔 role 字符串拆成数组。 */
export function parseRoleList(role: string | null | undefined): string[] {
  if (!role) return [];
  return role
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
