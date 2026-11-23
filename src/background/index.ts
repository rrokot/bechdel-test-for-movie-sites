import { pruneCaches } from '../shared/cache.ts';
import { caches, imdbIdCache, imdbIdCacheKey } from '../shared/caches.ts';
import { CONFIG, MINUTE_MS } from '../shared/config.ts';
import { useTransport } from '../shared/http.ts';
import type { Message, Reply, RequestType, Requests, TitleRef } from '../shared/messages.ts';
import { resolveImdbId } from '../sources/wikidata.ts';
import { bechdelStatus, dropRetiredBechdelDb, findBechdelMovie, syncBechdelDb } from './bechdel-db.ts';
import { fetchDirect } from './proxy.ts';

const MAINTENANCE_ALARM = 'daily-maintenance';

useTransport(fetchDirect);

const resolveTitleRefToImdbId = async (ref: TitleRef) => {
  if ('imdbId' in ref) return ref.imdbId;
  const key = imdbIdCacheKey(ref.property, ref.id);
  const cached = (await imdbIdCache.getMany([key])).get(key);
  if (cached) return cached.imdbId ?? ref.imdbHint ?? null;
  try {
    const imdbId = await resolveImdbId(ref.property, ref.id);
    await imdbIdCache.set(key, { imdbId });
    return imdbId ?? ref.imdbHint ?? null;
  } catch (error) {
    // The page's own IMDb link still identifies the movie when Wikidata is down.
    if (ref.imdbHint) return ref.imdbHint;
    throw error;
  }
};

type Handlers = { [K in RequestType]: (message: Message<K>) => Promise<Requests[K]['response']> };

const handlers: Handlers = {
  fetch: ({ type, ...request }) => fetchDirect(request),
  'bechdel:find': async ({ ref }) => {
    const imdbId = await resolveTitleRefToImdbId(ref);
    return { imdbId, movie: imdbId ? await findBechdelMovie(imdbId) : null };
  },
  'bechdel:status': () => bechdelStatus(),
  'bechdel:sync': async () => {
    await syncBechdelDb();
    return bechdelStatus();
  },
};

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse: (reply: Reply) => void) => {
  if (sender.id !== chrome.runtime.id || !(message?.type in handlers)) return false;
  const handle = handlers[message.type] as (message: Message) => Promise<unknown>;
  handle(message).then(
    (value) => sendResponse({ ok: true, value } as Reply),
    (error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }),
  );
  return true;
});

const warnMaintenanceFailed = (error: unknown) => console.warn('[Bechdel] Maintenance failed', error);

const runDailyMaintenance = () => {
  pruneCaches(caches).catch(warnMaintenanceFailed);
  syncBechdelDb().catch(warnMaintenanceFailed);
};

const ensureMaintenanceAlarm = async () => {
  if (!await chrome.alarms.get(MAINTENANCE_ALARM)) {
    await chrome.alarms.create(MAINTENANCE_ALARM, { periodInMinutes: CONFIG.bechdelSyncIntervalMs / MINUTE_MS });
  }
};

// Alarms and storage outlive updates: after one, keep only what this version
// uses.
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.clearAll().then(ensureMaintenanceAlarm).catch(warnMaintenanceFailed);
  dropRetiredBechdelDb().catch(warnMaintenanceFailed);
  runDailyMaintenance();
});
chrome.alarms.onAlarm.addListener(({ name }) => {
  if (name === MAINTENANCE_ALARM) runDailyMaintenance();
});

// Alarms may be dropped on browser restart.
ensureMaintenanceAlarm().catch(warnMaintenanceFailed);
