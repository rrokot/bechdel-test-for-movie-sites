export const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const CONFIG = {
  requestTimeoutMs: 20_000,
  cacheTtlMs: 7 * DAY_MS,
  missCacheTtlMs: DAY_MS,
  idCacheTtlMs: 30 * DAY_MS,
  bechdelSyncIntervalMs: DAY_MS,
  bechdelSyncConcurrency: 2,
  kinopoiskConcurrency: 10,
  kinopoiskSearchConcurrency: 1,
  kinopoiskCandidateLimit: 3,
  kinopoiskYearTolerance: 1,
  genreLimit: 3,
} as const;

// Everything the extension fetches. Its hosts become the manifest's
// host_permissions, so links that are only shown to people live in LINKS.
export const URLS = {
  bechdeltest: 'https://bechdeltest.com',
  bechdeltestSitemap: 'https://bechdeltest.com/sitemap.xml',
  wikidataSparql: 'https://query.wikidata.org/sparql',
  imdbGraphql: 'https://api.graphql.imdb.com/',
  kinopoiskRating: 'https://rating.kinopoisk.ru',
  kinopoiskSearch: 'https://www.kinopoisk.ru/index.php',
  kinopoiskFilm: 'https://www.kinopoisk.ru/film',
} as const;

// Match patterns of the pages the bechdeltest content script runs on.
export const BECHDELTEST_PAGES = ['https://bechdeltest.com/*', 'https://www.bechdeltest.com/*'];

export const LINKS = {
  bechdeltestAdd: 'https://bechdeltest.com/add/',
  imdbTitle: 'https://www.imdb.com/title',
} as const;

export const FETCH_HOSTS: readonly string[] = [
  ...new Set(Object.values(URLS).map((url) => new URL(url).hostname)),
];
