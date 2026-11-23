import type { BechdelMovie } from '../shared/bechdel.ts';
import { CONFIG, URLS } from '../shared/config.ts';
import { request } from '../shared/http.ts';
import type { BechdelStatus } from '../shared/messages.ts';
import { runPool } from '../shared/pool.ts';
import { parseListPage, parseSitemap } from '../sources/bechdeltest.ts';

// A local copy of the whole bechdeltest.com movie list (about 11,000 movies,
// 1.3 MB). bechdeltest.com has no API, but its sitemap dates every list page,
// so a sync only downloads — and only rewrites — the pages that changed.
//
// Storage layout, versioned like the caches so a format change never needs a
// migration: one small meta key plus one key per list page.
const ROOT = 'bechdel:';
const VERSION = `${ROOT}v1:`;
const META_KEY = `${VERSION}meta`;
const pageKey = (url: string) => `${VERSION}page:${url}`;

type Meta = {
  syncedAt: number | null;
  // List page URL → its sitemap date; '' forces a retry on the next sync.
  pages: Record<string, string>;
};

type BechdelDb = {
  meta: Meta;
  pages: Map<string, BechdelMovie[]>;
  moviesByImdbId: Map<string, BechdelMovie>;
};

// The daily alarm normally keeps the copy fresh; the margin leaves it room
// before a lookup triggers a sync of its own.
const OVERDUE_AFTER_MS = CONFIG.bechdelSyncIntervalMs * 1.5;

// Read from storage once per worker lifetime and replaced after every sync.
let db: Promise<BechdelDb> | null = null;
let syncing: Promise<void> | null = null;

const buildDb = (meta: Meta, pages: Map<string, BechdelMovie[]>): BechdelDb => ({
  meta,
  pages,
  moviesByImdbId: new Map([...pages.values()].flatMap((movies) => movies.map((movie) => [movie.imdbId, movie]))),
});

const readStorage = async () => {
  const meta = ((await chrome.storage.local.get(META_KEY))[META_KEY] as Meta | undefined)
    ?? { syncedAt: null, pages: {} };
  const urls = Object.keys(meta.pages);
  const stored = urls.length ? await chrome.storage.local.get(urls.map(pageKey)) : {};
  const pages = new Map(urls.flatMap((url) => {
    const movies = stored[pageKey(url)] as BechdelMovie[] | undefined;
    return movies ? [[url, movies] as const] : [];
  }));
  return buildDb(meta, pages);
};

const loadDb = () => {
  db ??= readStorage();
  return db;
};

const runSync = async () => {
  const listPages = parseSitemap((await request(URLS.bechdeltestSitemap)).text);
  if (!listPages.length) throw new Error('The bechdeltest.com sitemap lists no movie pages');

  const previous = await loadDb();
  const pages = new Map<string, BechdelMovie[]>();
  const changed: Record<string, BechdelMovie[]> = {};
  const meta: Meta = { syncedAt: previous.meta.syncedAt, pages: {} };
  let failed = 0;

  await runPool(listPages, CONFIG.bechdelSyncConcurrency, async ({ url, lastmod }) => {
    const known = previous.pages.get(url);
    if (known && previous.meta.pages[url] === lastmod) {
      pages.set(url, known);
      meta.pages[url] = lastmod;
      return;
    }
    try {
      const movies = parseListPage((await request(url)).text);
      pages.set(url, movies);
      changed[pageKey(url)] = movies;
      meta.pages[url] = lastmod;
    } catch (error) {
      failed += 1;
      console.warn('[Bechdel] Could not sync', url, error);
      // Keep the old movies, but without a date so the next sync retries.
      if (known) {
        pages.set(url, known);
        meta.pages[url] = '';
      }
    }
  });

  if (!failed) meta.syncedAt = Date.now();
  const dropped = [...previous.pages.keys()].filter((url) => !pages.has(url)).map(pageKey);
  await chrome.storage.local.set({ ...changed, [META_KEY]: meta });
  if (dropped.length) await chrome.storage.local.remove(dropped);
  db = Promise.resolve(buildDb(meta, pages));
};

export const syncBechdelDb = () => {
  syncing ??= runSync().finally(() => {
    syncing = null;
  });
  return syncing;
};

// Removes the data of previous storage versions.
export const dropRetiredBechdelDb = async () => {
  const retired = (await chrome.storage.local.getKeys())
    .filter((key) => key.startsWith(ROOT) && !key.startsWith(VERSION));
  if (retired.length) await chrome.storage.local.remove(retired);
};

// The first lookup waits for a full download; later ones answer from the
// current copy and refresh it in the background when it is overdue.
const ensureFresh = async () => {
  const { meta, pages } = await loadDb();
  if (!pages.size) {
    await syncBechdelDb();
  } else if (meta.syncedAt === null || Date.now() - meta.syncedAt > OVERDUE_AFTER_MS) {
    syncBechdelDb().catch((error: unknown) => console.warn('[Bechdel] Sync failed', error));
  }
};

export const findBechdelMovie = async (imdbId: string) => {
  await ensureFresh();
  return (await loadDb()).moviesByImdbId.get(imdbId) ?? null;
};

export const bechdelStatus = async (): Promise<BechdelStatus> => {
  const { meta, moviesByImdbId } = await loadDb();
  return { movies: moviesByImdbId.size, syncedAt: meta.syncedAt, syncing: syncing !== null };
};
