/**
 * 语言感知的导航 API。
 *
 * 全站统一用这里的 Link / useRouter / redirect，而不是 next/link ——
 * 它们会自动带上当前语言前缀，避免手写 `/zh/...` 拼错或漏写。
 */
import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
