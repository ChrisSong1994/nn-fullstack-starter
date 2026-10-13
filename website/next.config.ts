import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

/** 后端地址：浏览器与 RSC 都通过它访问 API（浏览器侧走下面的 rewrites 同源转发）。 */
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:5050';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  // Cache Components（PPR）：静态外壳 + 动态内容流式渲染。
  // 注意 partialPrefetching 必须显式给出，否则启动时会告警。
  cacheComponents: true,
  partialPrefetching: true,

  /**
   * 浏览器侧的 `/api/*` 同源转发到后端。
   *
   * 为什么不用后端地址直连 + CORS：跨站请求下 better-auth 的会话 Cookie 需要
   * `SameSite=None; Secure` 才能在 localhost 上生效，开发环境（http）根本起不来。
   * 走同源转发后 Cookie 是第一方 Cookie，`SameSite=Lax` 就够，也少了一层 CORS 配置。
   */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },

  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default withNextIntl(nextConfig);
