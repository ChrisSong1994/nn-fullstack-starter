# AGENTS.md

给 AI 编码代理的项目说明。人读的版本见 `README.md`，两者冲突时以本文件为准（本文件会随代码更新）。
`website/AGENTS.md` 由 `next dev` 自动生成并回写，**不要手改它**。

## 项目概览

nextjs + nestjs 的全栈 SaaS 启动模板，monorepo（pnpm workspace）。当前已完成「全栈认证闭环」：
邮箱注册登录、忘记密码/重置、邮箱验证、RBAC（角色 + 权限点）、后台用户与角色管理、BullMQ 邮件队列。

| 位置 | 包名 | 技术 | 端口 |
| --- | --- | --- | --- |
| `server/` | `@nnfs/server` | NestJS 12 + Prisma 7 + better-auth 1.7 + BullMQ + nestjs-zod | 5050 |
| `website/` | `@nnfs/website` | Next.js 16（App Router）+ React 19 + antd 6 + Tailwind v4 + Zustand + next-intl | 5055 |
| `packages/shared/` | `@nnfs/shared` | 同构层：zod schema、DTO 类型、权限目录与工具 | — |

数据库 PostgreSQL + Redis（两者均需本机可连）。Node ≥ 22，包管理器 `pnpm@11.5.1`。

## 常用命令

在**仓库根目录**执行，不要进子包手动 `npm run`：

```bash
pnpm install

pnpm dev            # 先 build shared，再并行起 shared(watch) + server + website
pnpm dev:server     # 只起后端（5050）
pnpm dev:website    # 只起前端（5055）
pnpm build          # 递归构建
pnpm lint           # 递归 lint（server/shared 用 oxlint --type-aware，website 用 eslint）
pnpm test           # 递归测试（server/shared 用 vitest；website 目前没有测试脚本）

pnpm db:migrate     # prisma migrate dev（会自动灌种子）
pnpm db:seed        # 灌种子数据（幂等）
pnpm db:studio      # Prisma Studio
```

单包命令用 `pnpm --filter @nnfs/server <script>`。首次跑需要：

```bash
cp server/.env.example server/.env      # 至少改 BETTER_AUTH_SECRET
cp website/.env.example website/.env.local
```

## 目录结构

```
packages/shared/src/    constants/（权限目录、预置角色）· schemas/（zod）· types/ · utils/
server/src/
  config/               env.ts（zod 校验环境变量，单一入口）+ app-env.service.ts
  auth/                 better-auth 装配（auth.factory / auth.service）+ 会话守卫
  rbac/                 catalog-sync.ts（权限目录落库，纯函数）+ rbac.service
  admin/ users/         角色管理、用户管理接口
  infra/                prisma / redis / mail 三个基础设施模块
    logger/             winston 装配 · ALS 请求上下文 · 访问日志 · 脱敏
    logs/               系统控制台（日志查询/下载/清空）接口
  common/               constants · decorators · guards · filters
  generated/prisma/     Prisma Client 产物（不要手改）
prisma/                 schema.prisma · migrations/ · seed.ts
website/
  app/[locale]/         页面（App Router，全部带语言前缀）
  components/           UI（antd 只出现在 'use client' 文件里）
  lib/                  api-client（fetch 封装）· auth-client · server-session（服务端取会话）
  stores/               zustand：会话/权限快照
  i18n/                 routing · request · navigation
  messages/             zh.json / en.json
  proxy.ts              Next 16 的 middleware（语言路由 + 乐观登录校验）
```

## 跨包约定

- **`@nnfs/shared` 消费的是它自己的 `dist/`**。改了 shared 源码必须 `pnpm --filter @nnfs/shared build`（或跑 `pnpm dev` / `pnpm dev:shared` 让它 watch），否则 server / website 看不到新类型。新增导出记得从对应的 `index.ts` 里 re-export。
- **类型与校验 schema 放 shared，接口两侧共用**：DTO 由前端 `import type` 直接复用，后端用 `createZodDto(共享 schema)` 生成校验与 Swagger schema。
- **权限点目录只有一份**：`packages/shared/src/constants/permissions.ts` 的 `PERMISSIONS` / `PERMISSION_META` / `DEFAULT_ROLES`。新增权限点写进 `PERMISSIONS` 后，`PERMISSION_META` 漏写会编译报错；改完要重新 seed（`syncRbacCatalog` 幂等同步）。注意 `syncDefaultRoles` 只在预置角色**首次创建**时写默认权限，之后不再覆盖（否则后台里对 `admin` 的权限调整会被下一次同步抹掉）—— 已存在的库里给 `admin` 补新权限得去后台「角色权限」页手动勾，或者直接改 `super_admin`（它每次都对齐到全量）。
- 所有面向用户的文案、代码注释、提交信息用中文；**文档与注释写中文**，标识符写英文。

## 日志（系统控制台）

服务端日志用 `winston` + `winston-daily-rotate-file` 同时落盘与打控制台，后台 `/admin/logs` 页面查看。动这块之前先记住：

- **落盘位置**：默认 `server/logs/`（`LOG_DIR`，相对路径按 server 的 CWD 解析），按天滚动成 `application-YYYY-MM-DD.log` 和 `error-YYYY-MM-DD.log`（后者只收 error 级别）。超 `LOG_MAX_SIZE`（默认 `50m`）切分片、超 `LOG_MAX_FILES`（默认 `30d`）清理、默认 gz 归档。文件名必须能被 `packages/shared/src/schemas/logs.ts` 的 `LOG_FILENAME_PATTERN` 匹配，否则列不出来（同目录还有 `winston-daily-rotate-file` 自己写的隐藏审计文件，就是靠这个白名单过滤掉的）。
- **请求 ID 走 AsyncLocalStorage**：`infra/logger/request-context.ts` 里只放 `requestId`，winston 的 format 从 ALS 取出来写进每条日志，同时回写 `X-Request-Id` 响应头。入站同名头格式不合法就换新的。**别往 ALS 里塞用户身份** —— 用户是 `request.user`（AuthGuard 写入）的事。
- **访问日志是手动 `app.use()` 挂的**（`bootstrap.ts` 第 0 步），不是 Nest 中间件。原因：Nest 的模块中间件要等 `app.init()`/`listen()` 才注册，会排在手挂的 better-auth 后面，`/api/auth/*` 就既没有 requestId 也不打日志了。要动这块先读 `infra/logger/logger.middleware.ts` 的文件头注释。
- **脱敏**在 `infra/logger/redact.ts`，按 key 名匹配 `logger.constants.ts` 里的 `SENSITIVE_KEYWORDS`（大小写不敏感，深度与长度都有上限）。它是「少写点垃圾」而不是安全边界 —— 日志目录本身要按敏感数据对待。加了新的密钥类字段记得补关键字。
- **查询接口**：`GET /api/admin/logs/{files,content,stats,download}` + `POST /api/admin/logs/clear`。每次查询都会流式扫一遍整个文件（要给精确总行数，不能提前退出），文件大时慢是设计内的取舍；`.gz` 归档只能整份删除，不能部分截断。
- **权限点**：`log:read` 给 `admin` 预置角色，`log:clear` 是不可逆操作所以只给 `super_admin`。
- **前端不自动刷新**：`components/admin/logs-viewer.tsx` 和全仓库其它列表页一样没有轮询/SSE，要看最新的点「刷新」。过滤在服务端做，所以关键字是回车/点搜索才提交。

## server 约定

- **ESM + NodeNext**：`package.json` 是 `"type": "module"`，源码里的相对导入**必须带 `.js` 后缀**（如 `./bootstrap.js`），否则构建期就报错。
- **环境变量只有一个入口**：`src/config/env.ts` 的 zod schema。新增变量要同时改 `envSchema` 与 `server/.env.example`；业务代码通过 `AppEnvService` 读取，**不要直接摸 `process.env`**。校验失败会让进程在启动阶段直接退出。
- **Prisma 7 的差异**：`schema.prisma` 里没有 `datasource.url`，连接串在 `prisma.config.ts`；Prisma CLI 不会自动读 `.env`（那边手动 `loadEnvFile`）；Client 生成到 `src/generated/prisma/`（不是 `node_modules`）。
- **鉴权链路**：全局 `AuthGuard` → `PermissionsGuard`（注册顺序即执行顺序，不要调换）。接口按需加 `@RequirePermissions(PERMISSIONS.X)`，公开接口加 `@Public()`，取当前用户用 `@CurrentUser()`。
- **响应格式**：业务接口成功直接返回数据（如 `/api/me` → `{ user, roles, permissions }`）；失败由 `AllExceptionsFilter` 统一成 `{ success: false, code, message, errors? }`。`/api/auth/*` 归 better-auth，格式不受此约束。
- **装配顺序不能动**：`src/bootstrap.ts` 里 better-auth 必须挂在 `express.json()` **之前**（所以 `bodyParser: false`），且挂在根路径做前缀匹配，避免 express 改写 `req.url`。
- **seed 里不用 Nest DI**：`prisma/seed.ts` 由 `tsx` 执行，esbuild 不产出 `emitDecoratorMetadata`，构造参数注入会失效。需要复用的逻辑抽成 `src/rbac/catalog-sync.ts` 那样的纯函数，seed 与 Nest 侧共用。
- **构造参数注入的类型必须是值导入**：`import type { X }` 会被编译期抹掉，`design:paramtypes` 退化成 `Function`，启动时报「依赖解析不到」。这个坑只在运行时炸，类型检查看不出来 —— 注入 `AppEnvService` 这类 provider 时老实用普通 `import`。
- 测试用 vitest：单测 `*.spec.ts`（`pnpm --filter @nnfs/server test`），e2e `*.e2e-spec.ts`（`test:e2e`）。e2e 通过 `createApp()` 复用线上同一套装配。
- lint 是 `oxlint --type-aware`，其中 `typescript/no-floating-promises` 为 error（浮动的 Promise 要 `void` 或 `await`）。

## website 约定

- **路由是 Next 自带的 App Router**（`app/[locale]/…`），没有 react-router；导航用 next-intl 的 `createNavigation` 导出的 `Link` / `useRouter`，不要用 `next/link` 的裸版本。
- **语言前缀恒存在**（`localePrefix: 'always'`，zh 默认）。新增页面文案要同时写 `messages/zh.json` 与 `messages/en.json`。
- **服务端取语言只走 `next/root-params`**（在 `i18n/request.ts` 里读一次）。不要引入 `setRequestLocale` / `requestLocale` —— 前者在 next-intl 4.14 已废弃，后者离开它就取不到值。
- **浏览器不直连后端**：`/api/*` 由 `next.config.ts` 的 `rewrites` 同源转发到 `BACKEND_URL`，这样会话 Cookie 是第一方 Cookie。改后端地址只改 `BACKEND_URL`，不要改成直连 + CORS。
- 取会话分两层：`proxy.ts` 只做 Cookie 存在性的乐观跳转；**权威校验在 `lib/server-session.ts`**（`getCurrentUser` / `requirePermissions`），它把 Cookie 转给后端 `/api/me`，不重复实现鉴权。页面里先鉴权、再请求数据。
- **antd 组件只能在 `'use client'` 文件里使用**；服务端组件用 `lib/server-session.ts`，客户端状态用 `stores/session-store.ts`（它只是渲染缓存，`can()` 仅供按钮显隐，**不是安全边界**）。
- 接口调用统一走 `lib/api-client.ts` 的 `apiFetch`（成功返回数据，失败抛 `ApiError`），不要裸 `fetch`。

## 已知坑

- `server/`、`website/`、`packages/*` 的产物目录（`dist/`、`.next/`、`server/src/generated/prisma/`）都不要提交，也不要在其中手改代码。
- 改 shared 后忘记 build，会出现「类型明明改对了却报旧类型」的假象 —— 先 `pnpm --filter @nnfs/shared build` 再排查。
- 不发邮件（`SMTP_HOST` 留空）时，验证/重置链接打印在后端日志里，别去翻邮件。
- `Dockerfile`、`nginx.conf` 目前是空占位文件，部署链路还没接。
- 后端调试配置在 `.vscode/launch.json`：`nest start` 会 spawn 子进程跑 `dist/main.js`，所以启动式调试必须开 `autoAttachChildProcesses`、且 `cwd` 指向 `server/`（`nest-cli.json`、`tsconfig.build.json`、`.env` 都按它解析）。别把它改成直接跑 `node dist/main.js`。

## 测试
- server 里面每个功能都要实现单元测试，集成测试
- website 里面不要端到端测试，需要针对重要核心功能进行单元测试

## 文档与 Git

- 代码注释和文档使用中文
- 不提交 `.env*`、密钥、生产凭证、`dist/`、`coverage/`、日志或本地产物
- 不要覆盖用户未提交的工作；操作 Git 前先检查 `git status`
- 不要执行破坏性历史操作（`git reset --hard`、强制推送、清理未跟踪文件等），除非用户明确要求
- 提交前检查 diff，确保只包含本次任务相关文件
- 修改完成后不要自动提交，需等用户确认并完成 review 后再提交
