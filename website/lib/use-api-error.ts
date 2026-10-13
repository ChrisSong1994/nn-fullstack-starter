'use client';

/**
 * 把接口错误翻成给用户看的一句话。
 *
 * 后端的错误码（FORBIDDEN / VALIDATION_ERROR…）在 messages 里都有对应文案，
 * 命中就用文案，没命中（比如 HTTP_500）退回后端给的 message。
 */
import { useTranslations } from 'next-intl';

import { ApiError } from './api-client';

export function useApiErrorMessage(): (error: unknown) => string {
  const t = useTranslations('error');

  return (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.code && t.has(error.code)) return t(error.code);
      return error.message || t('unknown');
    }
    return t('unknown');
  };
}
