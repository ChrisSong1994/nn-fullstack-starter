/**
 * better-auth 的浏览器端 SDK。
 *
 * 不给 baseURL：默认就是当前页面 origin，配合 next.config.ts 里的 `/api/*` 同源转发，
 * 请求落到后端却不产生跨站 Cookie 问题。basePath 保持后端一致（/.api/auth）。
 */
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  basePath: '/api/auth',
});

export const { signIn, signUp, signOut, requestPasswordReset, resetPassword, sendVerificationEmail } =
  authClient;
