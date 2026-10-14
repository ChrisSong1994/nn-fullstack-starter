/**
 * 权限点目录：前后端共用同一份，seed 会把它写进 Permission 表。
 *
 * code 的格式固定为 `resource:action`，后端守卫（@RequirePermissions('user:read')）、
 * better-auth 的 access control statement、前端按权限显隐按钮，全部从这里取。
 */
export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  ROLE_READ: 'role:read',
  ROLE_CREATE: 'role:create',
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete',
  ROLE_ASSIGN: 'role:assign',

  PERMISSION_READ: 'permission:read',

  SESSION_READ: 'session:read',
  SESSION_REVOKE: 'session:revoke',

  LOG_READ: 'log:read',
  LOG_CLEAR: 'log:clear',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** 资源名（code 的冒号前半段），用于 better-auth 的 access control statement 结构。 */
export type PermissionResource = 'user' | 'role' | 'permission' | 'session' | 'log';

/** 动作名（code 的冒号后半段）。 */
export type PermissionAction = 'read' | 'create' | 'update' | 'delete' | 'assign' | 'revoke' | 'clear';

export interface PermissionDefinition {
  code: PermissionCode;
  resource: PermissionResource;
  action: PermissionAction;
  /** 后台角色配置页的分组标题。 */
  group: string;
  description: string;
}

type PermissionMeta = Omit<PermissionDefinition, 'code'>;

/**
 * 每个权限点的元数据。键取自 PERMISSIONS 的字面量，且类型标注成
 * `Record<PermissionCode, ...>`：这样新增权限点时漏写元数据会直接编译报错。
 */
const PERMISSION_META: Record<PermissionCode, PermissionMeta> = {
  [PERMISSIONS.USER_READ]: { resource: 'user', action: 'read', group: '用户管理', description: '查看用户列表与详情' },
  [PERMISSIONS.USER_CREATE]: { resource: 'user', action: 'create', group: '用户管理', description: '创建用户' },
  [PERMISSIONS.USER_UPDATE]: { resource: 'user', action: 'update', group: '用户管理', description: '修改用户资料' },
  [PERMISSIONS.USER_DELETE]: { resource: 'user', action: 'delete', group: '用户管理', description: '删除用户' },

  [PERMISSIONS.ROLE_READ]: { resource: 'role', action: 'read', group: '角色权限', description: '查看角色与权限' },
  [PERMISSIONS.ROLE_CREATE]: { resource: 'role', action: 'create', group: '角色权限', description: '创建角色' },
  [PERMISSIONS.ROLE_UPDATE]: { resource: 'role', action: 'update', group: '角色权限', description: '修改角色及其权限' },
  [PERMISSIONS.ROLE_DELETE]: { resource: 'role', action: 'delete', group: '角色权限', description: '删除角色' },
  [PERMISSIONS.ROLE_ASSIGN]: { resource: 'role', action: 'assign', group: '角色权限', description: '给用户分配角色' },

  [PERMISSIONS.PERMISSION_READ]: { resource: 'permission', action: 'read', group: '角色权限', description: '查看权限点目录' },

  [PERMISSIONS.SESSION_READ]: { resource: 'session', action: 'read', group: '会话安全', description: '查看用户会话' },
  [PERMISSIONS.SESSION_REVOKE]: { resource: 'session', action: 'revoke', group: '会话安全', description: '强制下线用户会话' },

  [PERMISSIONS.LOG_READ]: { resource: 'log', action: 'read', group: '系统日志', description: '查看服务端日志' },
  [PERMISSIONS.LOG_CLEAR]: { resource: 'log', action: 'clear', group: '系统日志', description: '清空服务端日志' },
};

/** 权限点目录（顺序与 PERMISSION_META 的声明顺序一致）。 */
export const PERMISSION_CATALOG: readonly PermissionDefinition[] = (
  Object.keys(PERMISSION_META) as PermissionCode[]
).map((code) => ({ code, ...PERMISSION_META[code] }));

/** 所有权限点 code 的数组，seed 与 super_admin 直接用它。 */
export const ALL_PERMISSIONS: readonly PermissionCode[] = PERMISSION_CATALOG.map(
  (permission) => permission.code,
);

/**
 * code 的非空元组形式。zod 的 `z.enum` 需要元组类型才能推导出字面量联合，
 * 而 `.map()` 的结果是普通数组，因此这里收窄一次；运行时内容与 ALL_PERMISSIONS 相同。
 */
export const PERMISSION_CODE_TUPLE = ALL_PERMISSIONS as readonly [
  PermissionCode,
  ...PermissionCode[],
];

/** 按 group 分好组的目录，后台角色编辑页直接渲染。 */
export function groupPermissionCatalog(): { group: string; permissions: PermissionDefinition[] }[] {
  const groups: { group: string; permissions: PermissionDefinition[] }[] = [];
  for (const permission of PERMISSION_CATALOG) {
    const found = groups.find((item) => item.group === permission.group);
    if (found) found.permissions.push(permission);
    else groups.push({ group: permission.group, permissions: [permission] });
  }
  return groups;
}

/** 角色名常量。`user` 同时是 better-auth admin 插件的 defaultRole。 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export interface RoleDefinition {
  name: RoleName;
  displayName: string;
  description: string;
  /** 系统预置角色不允许删除。 */
  isSystem: boolean;
  permissions: readonly PermissionCode[];
}

/**
 * 预置角色：`super_admin` 全量；`admin` 能管用户与分配角色，但删用户、增删改角色不放给它；
 * `user` 是注册后的默认角色，没有任何管理权限（只有自己的 /api/me）。
 *
 * 日志：`admin` 能看（排查问题要靠它），但**不能清空** —— 清日志不可逆且和审计相关，
 * 只留给 `super_admin`。
 */
export const DEFAULT_ROLES: readonly RoleDefinition[] = [
  {
    name: ROLES.SUPER_ADMIN,
    displayName: '超级管理员',
    description: '拥有全部权限，不可删除',
    isSystem: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    name: ROLES.ADMIN,
    displayName: '管理员',
    description: '管理用户、给用户分配角色，不能删除用户或改角色定义',
    isSystem: true,
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.ROLE_READ,
      PERMISSIONS.ROLE_ASSIGN,
      PERMISSIONS.PERMISSION_READ,
      PERMISSIONS.SESSION_READ,
      PERMISSIONS.SESSION_REVOKE,
      PERMISSIONS.LOG_READ,
    ],
  },
  {
    name: ROLES.USER,
    displayName: '普通用户',
    description: '注册后的默认角色',
    isSystem: true,
    permissions: [],
  },
];

/** 注册后自动拿到的角色。 */
export const DEFAULT_ROLE: RoleName = ROLES.USER;
