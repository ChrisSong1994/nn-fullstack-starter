/**
 * 系统日志（后台日志查看器）的 schema。
 *
 * 日志文件名是**客户端传上来的字符串**，服务端会拿它去拼路径 —— 所以这里的正则既是
 * 入参校验，也是第一道防路径穿越的闸门。服务端读写两侧都引用同一份规则（见
 * `server/src/infra/logger/log-file.ts`），避免「能写不能读」这种漂移。
 */
import { z } from 'zod';

import { paginationSchema } from './common.js';

/** 日志流类型。`application` 收全部级别，`error` 只收 error。 */
export const LOG_FILE_TYPES = ['application', 'error'] as const;
export const logFileTypeSchema = z.enum(LOG_FILE_TYPES);
export type LogFileType = z.infer<typeof logFileTypeSchema>;

/** 日志级别（与 winston 的 npm 级别对齐）。 */
export const LOG_LEVELS = ['error', 'warn', 'info', 'http', 'debug'] as const;
export const logLevelSchema = z.enum(LOG_LEVELS);
export type LogLevel = z.infer<typeof logLevelSchema>;

/**
 * 合法的日志文件名。
 *
 * 形如 `application-2026-10-13.log`、`error-2026-10-12.log.1`（maxSize 分片）、
 * `application-2026-10-11.log.gz`（滚动归档）。除了这三段结构外不接受任何字符，
 * 因此 `..`、`/`、绝对路径都进不来。
 *
 * 捕获组是有意保留的，服务端拿它们拆出 `type / date / part / compressed`：
 * `1`=类型，`2`=日期，`3`=分片号，`4`=是否 gz。**只用 `.test()` 时不受影响。**
 */
export const LOG_FILENAME_PATTERN = /^(application|error)-(\d{4}-\d{2}-\d{2})\.log(?:\.(\d+))?(\.gz)?$/;

export const logFilenameSchema = z
  .string()
  .trim()
  .regex(LOG_FILENAME_PATTERN, '非法的日志文件名');

/** 列出日志文件；`date` 可选，只返回某一天的文件。 */
export const listLogFilesQuerySchema = z.object({
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD')
    .optional(),
});

/** 读取日志内容（正序分页 + 过滤）。 */
export const logContentQuerySchema = paginationSchema.extend({
  filename: logFilenameSchema,
  /**
   * 覆盖通用的 pageSize 上限（100 → 500）：日志是「一屏好多行」的读法，
   * 一页 20 行翻起来太痛苦；500 行 JSON 也还在几十 KB 量级。
   */
  pageSize: z.coerce.number().int().min(1).max(500).default(200),
  /** 只保留某级别的行。 */
  level: logLevelSchema.optional(),
  /** 关键字，按子串匹配整行。 */
  search: z.string().trim().max(200).optional(),
  /** 按请求 ID 过滤，用来把一次请求的所有日志串起来。 */
  requestId: z.string().trim().max(64).optional(),
});

/** 单文件统计（总行数 / 过滤后行数）。 */
export const logStatsQuerySchema = z.object({
  filename: logFilenameSchema,
  level: logLevelSchema.optional(),
  search: z.string().trim().max(200).optional(),
  requestId: z.string().trim().max(64).optional(),
});

export const downloadLogQuerySchema = z.object({
  filename: logFilenameSchema,
});

/**
 * 清空日志。
 *
 * `all` = 清空；`range` = 只保留最近 `keepLines` 行（留个现场，别一刀切干净）。
 *
 * 「`mode='range'` 必须带 `keepLines`」这条没写成 `.refine()` —— 加了 `.refine()` 之后
 * schema 会变成 ZodEffects，`createZodDto` 与 Swagger 就认不出来了。所以放到服务端判，
 * 报错同样是 400。
 */
export const clearLogSchema = z.object({
  filename: logFilenameSchema,
  mode: z.enum(['all', 'range']),
  keepLines: z.coerce.number().int().min(1).max(100_000).optional(),
});

export type ListLogFilesQueryDto = z.output<typeof listLogFilesQuerySchema>;
export type LogContentQueryDto = z.output<typeof logContentQuerySchema>;
export type LogStatsQueryDto = z.output<typeof logStatsQuerySchema>;
export type DownloadLogQueryDto = z.output<typeof downloadLogQuerySchema>;
export type ClearLogDto = z.output<typeof clearLogSchema>;
