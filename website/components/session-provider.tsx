'use client';

/**
 * 把服务端读到的会话写进 zustand store。
 *
 * 服务端渲染时已经知道用户是谁，这里只是把它「灌」给客户端，避免首屏再打一次
 * `/api/me` 造成的水合闪烁。之后的变更（登录、退出、改角色）由 store.refresh() 更新。
 */
import { useEffect } from 'react';
import type { CurrentUserProfile } from '@nnfs/shared';

import { useSessionStore } from '@/stores/session-store';

export function SessionProvider({
  profile,
  children,
}: {
  profile: CurrentUserProfile | null;
  children: React.ReactNode;
}) {
  const setProfile = useSessionStore((state) => state.setProfile);

  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);

  return children;
}
