import { describe, expect, it } from 'vitest';

import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE,
  DEFAULT_ROLES,
  PERMISSION_CATALOG,
  PERMISSIONS,
  ROLES,
  groupPermissionCatalog,
  hasAnyPermission,
  hasPermission,
  hasPermissions,
  parsePermissionCode,
  parseRoleList,
  toPermissionStatements,
} from '../src/index.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from '../src/schemas/auth.js';
import { permissionCodeSchema } from '../src/schemas/rbac.js';

describe('权限点目录', () => {
  it('每个 PERMISSIONS 里的 code 都出现在目录中', () => {
    const catalogCodes = PERMISSION_CATALOG.map((item) => item.code);
    for (const code of Object.values(PERMISSIONS)) {
      expect(catalogCodes).toContain(code);
    }
    expect(ALL_PERMISSIONS).toHaveLength(catalogCodes.length);
  });

  it('code 都是 resource:action 结构，且与 resource/action 字段一致', () => {
    for (const item of PERMISSION_CATALOG) {
      expect(item.code).toBe(`${item.resource}:${item.action}`);
    }
  });

  it('按 group 分组后不丢权限点', () => {
    const grouped = groupPermissionCatalog();
    const total = grouped.reduce((sum, group) => sum + group.permissions.length, 0);
    expect(total).toBe(PERMISSION_CATALOG.length);
    expect(grouped.length).toBeGreaterThan(0);
  });

  it('预置角色：super_admin 全量，user 为空，默认角色是 user', () => {
    const superAdmin = DEFAULT_ROLES.find((role) => role.name === ROLES.SUPER_ADMIN);
    const user = DEFAULT_ROLES.find((role) => role.name === ROLES.USER);
    expect(superAdmin?.permissions).toHaveLength(ALL_PERMISSIONS.length);
    expect(user?.permissions).toEqual([]);
    expect(DEFAULT_ROLE).toBe(ROLES.USER);
  });
});

describe('权限判定', () => {
  it('parsePermissionCode 只接受合法的 resource:action', () => {
    expect(parsePermissionCode('user:read')).toEqual({ resource: 'user', action: 'read' });
    expect(parsePermissionCode('user')).toBeNull();
    expect(parsePermissionCode(':read')).toBeNull();
    expect(parsePermissionCode('user:')).toBeNull();
  });

  it('toPermissionStatements 折叠成 better-auth 的 statement 结构', () => {
    expect(toPermissionStatements(['user:read', 'user:update', 'role:assign'])).toEqual({
      user: ['read', 'update'],
      role: ['assign'],
    });
    expect(toPermissionStatements(['user:read', 'user:read'])).toEqual({ user: ['read'] });
  });

  it('hasPermission / hasPermissions / hasAnyPermission', () => {
    const granted = [PERMISSIONS.USER_READ, PERMISSIONS.ROLE_ASSIGN];
    expect(hasPermission(granted, PERMISSIONS.USER_READ)).toBe(true);
    expect(hasPermission(granted, PERMISSIONS.USER_DELETE)).toBe(false);
    expect(hasPermissions(granted, [PERMISSIONS.USER_READ, PERMISSIONS.ROLE_ASSIGN])).toBe(true);
    expect(hasPermissions(granted, [PERMISSIONS.USER_READ, PERMISSIONS.USER_DELETE])).toBe(false);
    expect(hasAnyPermission(granted, [PERMISSIONS.USER_DELETE, PERMISSIONS.USER_READ])).toBe(true);
    // 空要求视为通过，方便守卫在未声明权限时直接放行。
    expect(hasPermissions(granted, [])).toBe(true);
  });

  it('parseRoleList 拆开 better-auth 的逗号分隔多角色', () => {
    expect(parseRoleList('admin,user')).toEqual(['admin', 'user']);
    expect(parseRoleList(' admin , user ')).toEqual(['admin', 'user']);
    expect(parseRoleList('')).toEqual([]);
    expect(parseRoleList(null)).toEqual([]);
  });
});

describe('认证 schema', () => {
  it('注册：邮箱转小写、弱密码被拒', () => {
    const parsed = registerSchema.parse({
      email: '  Foo@Example.COM ',
      password: 'abcd1234',
      name: '  张三  ',
    });
    expect(parsed.email).toBe('foo@example.com');
    expect(parsed.name).toBe('张三');

    expect(registerSchema.safeParse({ email: 'a@b.com', password: 'short', name: 'x' }).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'a@b.com', password: 'abcdefgh', name: 'x' }).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'not-an-email', password: 'abcd1234', name: 'x' }).success).toBe(false);
  });

  it('登录：rememberMe 默认 false', () => {
    expect(loginSchema.parse({ email: 'a@b.com', password: 'x' }).rememberMe).toBe(false);
    expect(loginSchema.parse({ email: 'a@b.com', password: 'x', rememberMe: true }).rememberMe).toBe(true);
  });

  it('改密：新旧密码不能相同', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'abcd1234',
      newPassword: 'abcd1234',
    });
    expect(result.success).toBe(false);
    expect(changePasswordSchema.safeParse({
      currentPassword: 'abcd1234',
      newPassword: 'wxyz5678',
    }).success).toBe(true);
  });

  it('权限点 schema 只接受目录里的 code', () => {
    expect(permissionCodeSchema.safeParse(PERMISSIONS.USER_READ).success).toBe(true);
    expect(permissionCodeSchema.safeParse('user:nuke').success).toBe(false);
    expect(permissionCodeSchema.options).toHaveLength(ALL_PERMISSIONS.length);
  });
});
