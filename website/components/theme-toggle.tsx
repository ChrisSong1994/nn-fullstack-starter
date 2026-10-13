'use client';

/**
 * 主题开关：浅色 ⇄ 深色。
 *
 * `checked` 取的是**实际生效**的颜色（`resolved`），所以「跟随系统」时开关跟着系统走；
 * 一旦拨动就把偏好写死成 light / dark，此后不再跟随系统。想让 UI 回到「跟随系统」得清掉
 * cookie（默认值仍是 system，见 lib/theme.ts）—— 这是个有意为之的取舍：开关只表达两态。
 *
 * 用 Switch 而不是 Segmented：两个状态用一个开关表达，「现在是深色吗」一眼可见，占位也更小。
 * 不传 `size="small"`：small 的轨道只有 16px 高（图标就有 12px），默认的 22px 和旁边那排
 * small 控件（高度 24px）反而更齐，图标也留得出余量。
 * 图标是内联 SVG —— 项目没有装 `@ant-design/icons`，为一个按钮引入整套图标包不划算。
 * 尺寸写成 `1em`，跟着 antd 的字号走（antd 给这块的 font-size 是 12px）。
 */
import { Switch, Tooltip } from 'antd';
import { useTranslations } from 'next-intl';

import { useTheme } from '@/components/theme-provider';

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle() {
  const t = useTranslations('theme');
  const { resolved, setMode } = useTheme();
  const isDark = resolved === 'dark';

  return (
    // 悬停提示当前是哪一态：图标开关本身不说人话，补一句「浅色 / 深色」。
    <Tooltip title={t(isDark ? 'dark' : 'light')}>
      <Switch
        aria-label={t('label')}
        checked={isDark}
        onChange={(next) => setMode(next ? 'dark' : 'light')}
        checkedChildren={<MoonIcon />}
        unCheckedChildren={<SunIcon />}
      />
    </Tooltip>
  );
}
