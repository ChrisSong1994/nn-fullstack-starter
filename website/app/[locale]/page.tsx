/**
 * 首页。
 *
 * 静态页面：不读会话，会话相关的展示交给 AppShell（它从客户端 store 读）。
 * 用 antd 的部分（HomeView）是客户端组件 —— 见 components/ui.tsx 的说明。
 */
import { getTranslations } from 'next-intl/server';

import { HomeView } from '@/components/home-view';

export async function generateMetadata({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: 'common' }))('appName') };
}

export default function HomePage() {
  return <HomeView />;
}
