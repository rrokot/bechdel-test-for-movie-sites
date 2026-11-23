import type { ImdbRating } from './imdb.ts';
import { createCache } from '../shared/cache.ts';
import { CONFIG } from '../shared/config.ts';

export type KinopoiskEntry = {
  // null when no verified Kinopoisk title exists for the IMDb id.
  kinopoiskId: string | null;
  rating: number | null;
  votes: number | null;
};

const ttlByRating = ({ rating }: { rating: number | null }) => (
  rating === null ? CONFIG.missCacheTtlMs : CONFIG.cacheTtlMs
);

export const imdbCache = createCache<ImdbRating>({ name: 'imdb', version: 1, ttl: ttlByRating });
// Version 2 drops entries that stored Kinopoisk's 0 as a rating.
export const kinopoiskCache = createCache<KinopoiskEntry>({ name: 'kinopoisk', version: 2, ttl: ttlByRating });

export const imdbIdCacheKey = (wikidataProperty: string, catalogId: string) => `${wikidataProperty}:${catalogId}`;

export const imdbIdCache = createCache<{ imdbId: string | null }>({
  name: 'imdb-id',
  version: 1,
  ttl: ({ imdbId }) => (imdbId === null ? CONFIG.missCacheTtlMs : CONFIG.idCacheTtlMs),
});

export const caches = [imdbCache, kinopoiskCache, imdbIdCache];
