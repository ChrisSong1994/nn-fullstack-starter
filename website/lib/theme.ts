/**
 * 主题（浅色 / 深色 / 跟随系统）的共享定义。
 *
 * 这里只放服务端与客户端都要用的纯逻辑，不 import `next/headers` 之类的服务端模块
 * —— 客户端组件也会引入这个文件。
 *
 * 偏好存在 Cookie 而不是 localStorage：服务端渲染时就能读到用户的选择，首帧直接是
 * 正确颜色，不会先闪一下浅色再变暗。localStorage 只有浏览器知道，只能用脚本补救。
 */

/** 存放主题偏好的 Cookie 名。 */
export const THEME_COOKIE = 'nnfs.theme';

/** 用户的选择；`system` 表示跟随系统，不写死颜色。 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 实际生效的颜色 —— `system` 交给浏览器偏好解析之后的结果。 */
export type ResolvedTheme = 'light' | 'dark';

/** 把 Cookie 里的字符串收窄成 ThemeMode；缺失或被改坏的值一律按「跟随系统」处理。 */
export function parseThemeMode(value: string | undefined): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** 用户选择 → 实际颜色。`system` 需要调用方给出系统偏好。 */
export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light';
  return mode;
}

/**
 * 首帧之前执行的初始化脚本，内联在 `<body>` 的第一行。
 *
 * 为什么这段必须在浏览器里跑：显式的「浅色 / 深色」服务端能从 Cookie 读出来，但
 * 「跟随系统」要问浏览器，服务端无从得知。脚本同步执行在页面内容之前，先把 `dark`
 * 类写到 `<html>` 上，避免整页「先浅后深」闪一下。
 *
 * 用 indexOf 找 Cookie 而不用正则：这段是模板字符串，`\s`、`\.` 会被吃掉一层转义，
 * 想写对得叠反斜杠，不如直接拆字符串省事。
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${THEME_COOKIE}=',v='',cs=document.cookie?document.cookie.split('; '):[];for(var i=0;i<cs.length;i++){if(cs[i].indexOf(k)===0){v=cs[i].slice(k.length);break;}}var m=v==='light'||v==='dark'?v:'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(_e){}})();`;
