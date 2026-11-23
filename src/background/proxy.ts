import { CONFIG, FETCH_HOSTS } from '../shared/config.ts';
import type { FetchRequest, FetchResponse } from '../shared/messages.ts';

const { HeaderOperation, ResourceType, RuleActionType } = chrome.declarativeNetRequest;

// IMDb GraphQL rejects requests whose Origin is not IMDb, and fetch() cannot
// set Origin itself. The rule only touches requests made outside of tabs,
// which is where this service worker's fetches come from.
const IMDB_ORIGIN_RULE: chrome.declarativeNetRequest.Rule = {
  id: 1,
  action: {
    type: RuleActionType.MODIFY_HEADERS,
    requestHeaders: [
      { header: 'origin', operation: HeaderOperation.SET, value: 'https://www.imdb.com' },
      { header: 'referer', operation: HeaderOperation.SET, value: 'https://www.imdb.com/' },
    ],
  },
  condition: {
    requestDomains: ['api.graphql.imdb.com'],
    resourceTypes: [ResourceType.XMLHTTPREQUEST],
    tabIds: [chrome.tabs.TAB_ID_NONE],
  },
};

// Session rules do not survive a browser restart, so they are installed every
// time the worker starts; fetches wait for them.
const rulesReady = chrome.declarativeNetRequest.updateSessionRules({
  removeRuleIds: [IMDB_ORIGIN_RULE.id],
  addRules: [IMDB_ORIGIN_RULE],
}).catch((error: unknown) => console.error('[Bechdel] Could not install the IMDb rule', error));

const ALLOWED_HOSTS = new Set(FETCH_HOSTS);

export const fetchDirect = async ({ url, method, headers, body }: FetchRequest): Promise<FetchResponse> => {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
    return { ok: false, reason: 'forbidden', message: `Host is not allowed: ${target.hostname}` };
  }
  if (method !== 'GET' && method !== 'POST') {
    return { ok: false, reason: 'forbidden', message: `Method is not allowed: ${String(method)}` };
  }

  await rulesReady;
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
