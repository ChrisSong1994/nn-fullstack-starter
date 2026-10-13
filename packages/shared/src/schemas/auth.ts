/**
 * 认证相关的 zod schema，前后端共用。
 *
 * 后端用它们生成 DTO（nestjs-zod 的 createZodDto）并顺带产出 Swagger schema；
 * 前端用同一份做表单校验，保证「前端拦下来的，后端也一定拦」。
 */
import { z } from 'zod';

/** 密码策略：8-64 位，且至少包含字母和数字。改这里前后端一起生效。 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;

export const emailSchema = z
  .string()
  .trim()
  .min(1, '请输入邮箱')
  .max(254, '邮箱过长')
  .email('邮箱格式不正确')
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `密码至少 ${PASSWORD_MIN_LENGTH} 位`)
  .max(PASSWORD_MAX_LENGTH, `密码最多 ${PASSWORD_MAX_LENGTH} 位`)
  .regex(/[a-zA-Z]/, '密码需包含字母')
  .regex(/[0-9]/, '密码需包含数字');

export const nameSchema = z
  .string()
  .trim()
  .min(1, '请输入昵称')
  .max(32, '昵称最多 32 个字符');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '请输入密码').max(PASSWORD_MAX_LENGTH),
  /** 勾选后签发长期会话（better-auth 的 rememberMe）。 */
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, '重置链接无效'),
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '请输入当前密码').max(PASSWORD_MAX_LENGTH),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: '新密码不能与当前密码相同',
    path: ['newPassword'],
  });

/** 校验邮箱验证邮件里的 token（点链接进来时先校验再展示结果）。 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, '验证链接无效'),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterDto = z.output<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type LoginDto = z.output<typeof loginSchema>;
export type ForgotPasswordDto = z.output<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.output<typeof resetPasswordSchema>;
export type ChangePasswordDto = z.output<typeof changePasswordSchema>;
export type VerifyEmailDto = z.output<typeof verifyEmailSchema>;
