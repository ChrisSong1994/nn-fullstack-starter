# nn-fullstack-starter

这是一个基于 nextjs 和 nestjs 开发的全栈 saas 项目启动模版项目，我希望帮我完成下面的事情

## 技术栈
- 前端 nextjs + antd + react19 + react router + Tailwind CSS v4 + Zustand + next-intl
  - 实际落地：路由用的是 Next.js 自带的 **App Router**（`app/[locale]/…`），没有引入 react-router —— 它和 Next 的 App Router 是两套并行方案，混用只会打架。i18n 用 next-intl 的 `defineRouting` / `createNavigation` 拿到类型安全的 `Link`、`useRouter`。
- 后端 nestjs + prisma + zod +  BullMQ + Better-Auth + @nestjs/swagger + s3
  - 实际落地：s3 部分（OSS 环境变量）已预留但本步未接入。
- 数据库 pgsql + redis   
- 目录划分，整体是 monorepo 的项目 packages/shared 存放 同构的部分, 别名使用 @nnfs

## 工程
- nginx + docker 部署
  - `Dockerfile`、`nginx.conf` 目前还是空占位文件，本步只跑本地开发。
- 前后端端口： 5050 5055

# 功能
- 用户系统支持 rbac
- 注册登录（支持邮件注册和登录）
  
---

## 当前进度

第一步「全栈认证闭环」已经跑通，范围是：

- **认证**：better-auth 1.7（数据库 session + 签名 Cookie，不再自签 JWT）
  - 邮箱 + 密码注册/登录/登出，会话 7 天滑动续期，支持「记住我」
  - 忘记密码 → 邮件重置链接 → 重设密码
  - 邮箱验证（`AUTH_REQUIRE_EMAIL_VERIFICATION=false` 时不强制，只提示）
- **RBAC**：角色 + 权限点的完整模型
  - 表：`Role` / `Permission` / `RolePermission` / `UserRole`
  - 权限码形如 `user:read`、`role:update`，后端 `@RequirePermissions('user:read')` 守卫
  - 三个内置角色：`super_admin`（全权限，不可改）、`admin`、`user`
  - 角色和权限点可在管理后台配置（`/zh/admin/roles`）
- **邮件**：BullMQ 队列 + SMTP；`SMTP_HOST` 留空时不发信，直接把验证/重置链接打进后端日志
- **前端**：首页、登录、注册、忘记密码、重置密码、邮箱验证、用户中心（`/dashboard`）、用户管理（`/admin/users`）、角色管理（`/admin/roles`），中英双语

管理后台的表格是客户端渲染（浏览器里翻页、筛选、增删改），HTML 里看不到行数据。

## 目录结构

```
├── packages/shared/         # 同构层（@nnfs/shared）：zod schema、DTO 类型、权限目录
├── server/                  # NestJS API（:5050）
│   ├── prisma/              # schema + migrations + seed
│   ├── src/auth/            # better-auth 装配、会话守卫
│   ├── src/rbac/            # 权限点目录 + 权限校验
│   ├── src/admin/           # 用户/角色管理接口
│   └── src/mail/            # BullMQ 邮件队列与 SMTP 发送
└── website/                 # Next.js 前端（:5055）
    ├── app/[locale]/        # 页面（App Router + next-intl 语言前缀）
    ├── components/          # UI（antd 只在 'use client' 文件里出现）
    ├── lib/                 # fetch 封装、better-auth 客户端、服务端取会话
    └── stores/              # Zustand（会话/权限快照）
```

`@nnfs/shared` 消费的是它自己的 `dist/`，**改了 shared 的源码要先 `pnpm --filter @nnfs/shared build`**，否则 server / website 看不到新类型。

## 快速开始

需要 Node ≥ 22、pnpm、本机跑着 PostgreSQL 与 Redis。

```bash
pnpm install

# 1. 后端环境变量（所有 SECRET/PASSWORD 都是占位值，务必改）
cp server/.env.example server/.env
#   至少改 BETTER_AUTH_SECRET：openssl rand -base64 48
#   数据库默认连 127.0.0.1:5432/postgres 上的专用库 nnfs_dev

# 2. 建库并灌入内置角色/权限 + 默认管理员
pnpm db:migrate    # 库不存在时 Prisma 会自动建（默认 nnfs_dev）
pnpm db:seed

# 3. 前端环境变量（不填也能跑，默认 BACKEND_URL=http://127.0.0.1:5050）
cp website/.env.example website/.env.local

# 4. 起服务（前端 5055，后端 5050）
pnpm dev
```

打开 <http://localhost:5055> 会自动跳到 `/zh`（默认语言，可切 `/en`）。

- 接口文档：<http://localhost:5050/api/docs>
- 默认管理员：`server/.env` 里的 `ADMINISTRATOR_EMAIL` / `ADMINISTRATOR_PASSWORD`（`.env.example` 的占位值是 `admin@example.com` / `change-me-please-1`；本地开发的那份 `.env` 用的是 `phipox@example.com` / `phipox123`）。**登录后请立刻改密码。**
- 不发邮件时，注册验证/重置密码的链接会打印在后端日志里。

## 常用命令

```bash
pnpm dev                 # 并行起 shared（watch）+ server + website
pnpm dev:server          # 只起后端
pnpm dev:website         # 只起前端
pnpm build               # 递归构建
pnpm lint                # 递归 lint（后端用 oxlint，前端用 eslint）
pnpm test                # 递归测试（后端 vitest）

pnpm db:migrate          # prisma migrate dev
pnpm db:seed             # 灌种子数据（幂等）
pnpm db:studio           # Prisma Studio
```

## 接口约定

- 业务接口（`/api/*`）**成功时直接返回数据**（如 `/api/me` → `{ user, roles, permissions }`），失败时返回 `{ success: false, code, message, errors? }`。
- 认证接口由 better-auth 挂在 `/api/auth/*`，返回它自己的格式，不套上面的错误信封。
- 鉴权走会话 Cookie `nnfs.session_token`（HttpOnly）；浏览器侧不直连后端，而是通过 Next 的 `rewrites` 把 `/api/*` 同源转发到 5050，这样 Cookie 是第一方 Cookie，`SameSite=Lax` 就够，也省掉一套 CORS 配置。
