'use client';

/**
 * 权限门：`<Can permission="user:create">…</Can>`。
 *
 * 只是 UI 层的显隐，别把它当安全边界 —— 后端的 @RequirePermissions 才是。
 */
import type { PermissionCode } from '@nnfs/shared';

import { useSessionStore } from '@/stores/session-store';

export function Can({
  permission,
  anyOf,
  children,
  fallback = null,
}: {
  /** 需要同时拥有的权限点。 */
  permission?: PermissionCode | readonly PermissionCode[];
  /** 或者「拥有其中任意一个」即可。 */
  anyOf?: readonly PermissionCode[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const can = useSessionStore((state) => state.can);
  const canAny = useSessionStore((state) => state.canAny);

  const allowed = anyOf ? canAny(anyOf) : permission ? can(permission) : true;

  return <>{allowed ? children : fallback}</>;
}
