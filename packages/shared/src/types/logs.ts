/**
 * 后台日志查看接口的数据形状，前后端共用。
 *
 * 后端 `LogsController` 直接返回这些类型，前端查看器 import 同一份定义来渲染 ——
 * 字段改名时两边一起编译报错。
 */
import type { LogFileType, LogLevel } from '../schemas/logs.js';

/** 日志文件列表的一项。 */
export interface LogFileMeta {
  /** 文件名，如 `application-2026-10-13.log`、`error-2026-10-12.log.gz`。 */
  name: string;
  /** 字节数。 */
  size: number;
  /** 最后修改时间（ISO 8601）。 */
  modifiedAt: string;
  type: LogFileType;
  /** 归属日期，`YYYY-MM-DD`。 */
  date: string;
  /** maxSize 分片编号；首个文件没有这一项。 */
  part?: number;
  /** 是否为 gz 归档文件。 */
  compressed: boolean;
}

export interface LogFileList {
  files: LogFileMeta[];
}

/** 解析后的一行日志。解析失败时只有 `raw` 有值。 */
export interface ParsedLogLine {
  /** 全局行号（从 1 开始），前端拿来定位/翻页。 */
  line: number;
  timestamp?: string;
  level?: LogLevel;
  /** 打日志的模块/上下文，如 `HTTP`。 */
  context?: string;
  message: string;
  /** JSON 行里除标准字段外的其余字段。 */
  meta?: Record<string, unknown>;
  /** 异常堆栈。 */
  stack?: string;
  /** 请求 ID。 */
  requestId?: string;
  /** 原始行文本（解析失败时是唯一可用字段）。 */
  raw: string;
}

/** 日志内容的分页结果。 */
export interface LogContentResult {
  lines: ParsedLogLine[];
  /** 当前页（从 1 开始）。 */
  page: number;
  pageSize: number;
  totalPages: number;
  /** 文件总行数。 */
  totalLines: number;
  /** 满足过滤条件的行数。 */
  filteredLines: number;
}

/** 单文件统计。 */
export interface LogStats {
  /** 文件总行数。 */
  total: number;
  /** 应用过滤条件后的行数。 */
  filtered: number;
}

/** 清空结果。 */
export interface ClearLogResult {
  cleared: boolean;
  /** `mode='range'` 时实际保留的行数。 */
  keptLines?: number;
}
