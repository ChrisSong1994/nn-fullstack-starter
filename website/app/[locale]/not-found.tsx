'use client';

/**
 * `[locale]` 段内的 404（由 notFound() 触发，比如不认识的 locale）。
 */
import { NotFoundView } from '@/components/ui';

export default function NotFound() {
  return <NotFoundView />;
}
