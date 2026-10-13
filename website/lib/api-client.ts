/**
 * 业务接口的浏览器端封装。
 *
 * 后端约定：成功直接返回数据；失败返回 `{ success: false, code, message, errors? }`。
 * 这里把这层差异吃掉，调用方只关心「拿到数据」或「抛 ApiError」。
 */

export interface ApiErrorPayload {
  success?: false;
  code?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** 把后端返回的错误码翻成用户能看懂的话（翻译在组件层做，这里只给兜底文案）。 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      // 同源代理到后端，Cookie 会自动带上；同源请求也要显式声明 credentials。
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', '网络异常，请稍后重试');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const payload = (body ?? {}) as ApiErrorPayload;
    throw new ApiError(
      response.status,
      payload.code ?? `HTTP_${response.status}`,
      payload.message ?? '请求失败',
      payload.errors,
    );
  }

  return body as T;
}
