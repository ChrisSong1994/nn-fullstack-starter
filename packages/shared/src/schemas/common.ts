/**
 * 通用 schema：分页查询、统一响应结构。
 */
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationDto = z.output<typeof paginationSchema>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 统一错误信封。
 *
 * 只有**失败**时后端才套这层：成功直接返回数据本身（例如 `/api/me` 返回
 * `{ user, roles, permissions }`），这样前端不用先剥一层 `data`。前端
 * `apiFetch` 负责把两种形状统一成「拿到数据」或「抛 ApiError」。
 * better-auth 自己的 `/api/auth/*` 有自己的格式，不走这里。
 */
export interface ApiErrorResponse {
  success: false;
  /** 业务错误码，例如 `FORBIDDEN`、`VALIDATION_ERROR`。 */
  code: string;
  message: string;
  /** 字段级校验错误：`{ email: ['邮箱格式不正确'] }`。 */
  errors?: Record<string, string[]>;
}
