/**
 * RBAC 管理接口的 schema。
 */
import { z } from 'zod';

import { PERMISSION_CODE_TUPLE } from '../constants/permissions.js';
import { emailSchema, nameSchema } from './auth.js';
import { paginationSchema } from './common.js';

/** 角色名：预置角色 + 后台自定义角色，格式限定为小写下划线。 */
export const roleNameSchema = z
  .string()
  .trim()
  .min(2, '角色标识至少 2 个字符')
  .max(32, '角色标识最多 32 个字符')
  .regex(/^[a-z][a-z0-9_]*$/, '只能用小写字母、数字和下划线，且以字母开头');

export const permissionCodeSchema = z.enum(PERMISSION_CODE_TUPLE, {
  error: '无效的权限点',
});

export const listUsersQuerySchema = paginationSchema.extend({
  keyword: z.string().trim().max(64).optional(),
  /** 按角色名过滤。 */
  role: z.string().trim().max(32).optional(),
  status: z.enum(['active', 'banned']).optional(),
});

export const createRoleSchema = z.object({
  name: roleNameSchema,
  displayName: z.string().trim().min(1, '请输入角色名称').max(32, '角色名称最多 32 个字符'),
  description: z.string().trim().max(200, '角色描述最多 200 个字符').optional(),
  permissions: z.array(permissionCodeSchema).default([]),
});

export const updateRoleSchema = z.object({
  displayName: z.string().trim().min(1, '请输入角色名称').max(32, '角色名称最多 32 个字符').optional(),
  description: z.string().trim().max(200, '角色描述最多 200 个字符').optional(),
  permissions: z.array(permissionCodeSchema).optional(),
});

export const assignRolesSchema = z.object({
  /** 完整覆盖该用户的角色集合；空数组表示回落到默认角色。 */
  roles: z.array(z.string().trim().min(1).max(32)).max(8, '最多同时拥有 8 个角色'),
});

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  /** better-auth admin 插件用它封禁/解封用户。 */
  banned: z.boolean().optional(),
  banReason: z.string().trim().max(200, '封禁原因最多 200 个字符').optional(),
});

export type ListUsersQueryInput = z.input<typeof listUsersQuerySchema>;
export type ListUsersQueryDto = z.output<typeof listUsersQuerySchema>;
export type CreateRoleDto = z.output<typeof createRoleSchema>;
export type UpdateRoleDto = z.output<typeof updateRoleSchema>;
export type AssignRolesDto = z.output<typeof assignRolesSchema>;
export type UpdateUserDto = z.output<typeof updateUserSchema>;
