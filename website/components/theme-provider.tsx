'use client';

/**
 * 主题上下文：浅色 / 深色 / 跟随系统。
 *
 * 状态起点是服务端从 Cookie 读出的 `initialMode`（所以首帧就是对的），之后由这里的
 * state 接管；每次改动顺手写回 Cookie，下次刷新服务端又能读到。
 *
 * 与 antd 的分工：这里只维护「模式」，并把它写到 `<html>` 上（Tailwind 的 `dark:`
 * 变体、滚动条与原生控件配色都看这个类）；antd 的深色皮肤由 AntdProvider 按
 * `resolved` 切 darkAlgorithm（见 components/antd-provider.tsx）。
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { resolveTheme, THEME_COOKIE, type ResolvedTheme, type ThemeMode } from '@/lib/theme';

interface ThemeContextValue {
  /** 用户的选择（含「跟随系统」）。 */
  mode: ThemeMode;
  /** 实际生效的颜色。 */
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Cookie 有效期一年：主题这种偏好没必要反复问。 */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function ThemeProvider({
  initialMode,
  children,
}: {
  initialMode: ThemeMode;
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  // 「跟随系统」要先知道系统偏好，而服务端无从得知，所以先按浅色渲染、挂载后再纠正
  // —— 这样服务端与客户端首帧一致，不会触发水合不一致。
  const [systemDark, setSystemDark] = useState(false);

  /**
   * 监听系统偏好 + 把结果写到 `<html>`，两件事放在同一个 effect 里。
   *
   * 关键是这里直接读 `matchMedia` 的结果，而不是读 state：如果拆成「先 setState、
   * 再由另一个 effect 按 state 写类」，第一次会拿着还没更新的浅色值把类抹掉一次，
   * 反而闪一下。合成一个 effect 就没有这个中间态。
   */
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const dark = resolveTheme(mode, query.matches) === 'dark';
      setSystemDark(query.matches);
      const root = document.documentElement;
      root.classList.toggle('dark', dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
    };

    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [mode]);

  const setThemeMode = useCallback((next: ThemeMode) => {
    setMode(next);
    // 写回 Cookie，服务端下次渲染就能直接拿到，不用等客户端纠正。
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  }, []);

  const value = useMemo(
    () => ({ mode, resolved: resolveTheme(mode, systemDark), setMode: setThemeMode }),
    [mode, systemDark, setThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** 读取当前主题。必须放在 `<ThemeProvider>` 内使用。 */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme 只能在 <ThemeProvider> 内部使用');
  return value;
}
