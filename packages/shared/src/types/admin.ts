/**
 * 后台管理接口的数据形状，前后端共用。
 *
 * 后端控制器直接返回这些类型（Swagger 也照它生成 schema），前端表格组件 import
 * 同一份定义来渲染 —— 接口字段改名时两边一起编译报错，而不是线上白屏。
 */
import type { PermissionCode } from '../constants/permissions.js';
import type { Paginated } from '../schemas/common.js';

/** 用户列表/详情里的用户条目（不含密码等敏感字段）。 */
export interface UserListItem {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  /** 角色名（来自 UserRole 表）。 */
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends UserListItem {
  /** 该用户展开后的权限点，后台详情页用来解释「他能做什么」。 */
  permissions: string[];
}

export type UserPage = Paginated<UserListItem>;

/** 权限点快照（后台权限勾选面板的一项）。 */
export interface PermissionSnapshot {
  code: PermissionCode;
  resource: string;
  action: string;
  group: string;
  description: string;
}

/** 角色定义（不含统计信息）。 */
export interface RoleSummary {
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionCode[];
}

/** 后台角色列表的一行。 */
export interface RoleListItem extends RoleSummary {
  /** 有多少用户绑了这个角色（决定能不能删）。 */
  userCount: number;
}

/** 权限点目录按 group 分组后的结构。 */
export interface PermissionGroup {
  group: string;
  permissions: PermissionSnapshot[];
}
