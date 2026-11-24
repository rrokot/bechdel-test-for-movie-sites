import { CONFIG, FETCH_HOSTS } from '../shared/config.ts';
import type { FetchRequest, FetchResponse } from '../shared/messages.ts';

const ALLOWED_HOSTS = new Set(FETCH_HOSTS);

export const fetchDirect = async ({ url, method, headers, body }: FetchRequest): Promise<FetchResponse> => {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return { ok: false, reason: 'forbidden', message: `Host is not allowed: ${target.hostname}` };
  }
  if (method !== 'GET' && method !== 'POST') {
    return { ok: false, reason: 'forbidden', message: `Method is not allowed: ${String(method)}` };
  }

  try {
    const response = await fetch(target, {
      method,
      headers,
      body,
      // Kinopoisk only serves pages to browsers that already passed its SSO.
      credentials: 'include',
      signal: AbortSignal.timeout(CONFIG.requestTimeoutMs),
    });
    return { ok: true, status: response.status, url: response.url, text: await response.text() };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return {
      ok: false,
      reason: timedOut ? 'timeout' : 'network',
      message: timedOut ? `${target.hostname} timed out` : `Could not reach ${target.hostname}`,
    };
  }
};
