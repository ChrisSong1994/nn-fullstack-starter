/**
 * 权限判定的同构工具。
 *
 * 这里的实现和 better-auth admin 插件的语义保持一致：一个角色 = 一组
 * `{ resource: [action] }`，用户拥有多个角色时逐个比对，命中任意一个即通过。
 * 后端守卫与前端按钮显隐都用它，保证「后端能过的，前端才显示」。
 */
import type { PermissionAction, PermissionCode, PermissionResource } from '../constants/permissions.js';

export interface PermissionStatements {
  readonly [resource: string]: string[];
}

/** 把 `user:read` 拆成 `{ resource: 'user', action: 'read' }`。 */
export function parsePermissionCode(code: string): { resource: string; action: string } | null {
  const index = code.indexOf(':');
  if (index <= 0 || index === code.length - 1) return null;
  return { resource: code.slice(0, index), action: code.slice(index + 1) };
}

/** 把权限点数组折叠成 `{ resource: [action, ...] }` 结构。 */
export function toPermissionStatements(codes: readonly string[]): PermissionStatements {
  const statements: Record<string, string[]> = {};
  for (const code of codes) {
    const parsed = parsePermissionCode(code);
    if (!parsed) continue;
    const actions = statements[parsed.resource] ?? (statements[parsed.resource] = []);
    if (!actions.includes(parsed.action)) actions.push(parsed.action);
  }
  return statements;
}

/** 当前用户是否拥有 `required` 里的全部权限。 */
export function hasPermissions(
  granted: readonly string[],
  required: readonly PermissionCode[],
): boolean {
  if (required.length === 0) return true;
  return required.every((code) => granted.includes(code));
}

/** 当前用户是否拥有任意一个权限（用于「有其一即可」的入口显示）。 */
export function hasAnyPermission(
  granted: readonly string[],
  candidates: readonly PermissionCode[],
): boolean {
  if (candidates.length === 0) return true;
  return candidates.some((code) => granted.includes(code));
}

/** 单个权限点的判定，等价于 hasPermissions(granted, [code])。 */
export function hasPermission(granted: readonly string[], code: PermissionCode): boolean {
  return granted.includes(code);
}

export type { PermissionAction, PermissionCode, PermissionResource };
