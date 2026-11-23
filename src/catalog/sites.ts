import type { TitleRef } from '../shared/messages.ts';

// A movie catalog: where its movie pages live, how a page names its movie, and
// the heading the badge goes next to. Catalog ids are Wikidata external-id
// properties, so one Wikidata lookup covers every catalog.
export type Site = {
  name: string;
  hosts: readonly string[];
  headingSelector: string;
  identify: (url: URL, document: Document) => TitleRef | null;
};

const IMDB_ID_IN_TEXT = /\btt\d{7,}\b/;

const byPath = (pattern: RegExp, toRef: (match: RegExpMatchArray) => TitleRef | null) => (
  (url: URL) => {
    const match = url.pathname.match(pattern);
    return match ? toRef(match) : null;
  }
);

const wikidataRef = (property: string, id: string | undefined): TitleRef | null => (
  id ? { property, id } : null
);

// Adds the IMDb id a page shows itself, used when Wikidata has no mapping.
const withImdbHint = (
  identify: (url: URL) => TitleRef | null,
  findImdbIdText: (document: Document) => string | null | undefined,
) => (url: URL, document: Document): TitleRef | null => {
  const ref = identify(url);
  if (!ref || 'imdbId' in ref) return ref;
  const imdbHint = findImdbIdText(document)?.match(IMDB_ID_IN_TEXT)?.[0];
  return imdbHint ? { ...ref, imdbHint } : ref;
};

const imdbLinkHref = (document: Document) => (
  document.querySelector('a[href*="imdb.com/title/tt"]')?.getAttribute('href')
);

export const SITES: readonly Site[] = [
  {
    name: 'IMDb',
    hosts: ['www.imdb.com', 'm.imdb.com'],
    headingSelector: 'h1[data-testid="hero__pageTitle"]',
    identify: byPath(/^\/(?:[a-z]{2}\/)?title\/(tt\d+)\/?$/, ([, imdbId]) => (imdbId ? { imdbId } : null)),
  },
  {
    name: 'Kinopoisk',
    hosts: ['www.kinopoisk.ru'],
    headingSelector: 'h1[itemprop="name"]',
    identify: byPath(/^\/(?:film|series)\/(\d+)\/?$/, ([, id]) => wikidataRef('P2603', id)),
  },
  {
    name: 'Letterboxd',
    hosts: ['letterboxd.com'],
    headingSelector: '.details h1',
    identify: withImdbHint(byPath(/^\/film\/([^/]+)\/?$/, ([, id]) => wikidataRef('P6127', id)), imdbLinkHref),
  },
  {
    name: 'TMDB',
    hosts: ['www.themoviedb.org'],
    headingSelector: '.header .title h2',
    identify: byPath(/^\/(movie|tv)\/(\d+)(?:-[^/]*)?\/?$/, ([, kind, id]) => (
      wikidataRef(kind === 'movie' ? 'P4947' : 'P4983', id)
    )),
  },
  {
    name: 'Trakt',
    hosts: ['trakt.tv', 'app.trakt.tv'],
    headingSelector: 'h1.trakt-responsive-title',
    identify: byPath(/^\/(movies|shows)\/([^/]+)\/?$/, ([, kind, slug]) => wikidataRef('P8013', `${kind}/${slug}`)),
  },
  {
    name: 'Rotten Tomatoes',
    hosts: ['www.rottentomatoes.com'],
    // The visible title; h1#media-hero-label is only an accessible label.
    headingSelector: 'media-hero rt-text[slot="title"]',
    identify: byPath(/^\/(m|tv)\/([^/]+)\/?$/, ([, kind, slug]) => wikidataRef('P1258', `${kind}/${slug}`)),
  },
  {
    name: 'Metacritic',
    hosts: ['www.metacritic.com'],
    headingSelector: '[data-testid="hero-title"] h1',
    identify: byPath(/^\/(movie|tv)\/([^/]+)\/?$/, ([, kind, slug]) => wikidataRef('P1712', `${kind}/${slug}`)),
  },
  {
    name: 'Douban',
    hosts: ['movie.douban.com'],
    headingSelector: '#content > h1',
    identify: withImdbHint(
      byPath(/^\/subject\/(\d+)\/?$/, ([, id]) => wikidataRef('P4529', id)),
      (document) => document.querySelector('#info')?.textContent,
    ),
  },
  {
    name: 'FilmAffinity',
    hosts: ['www.filmaffinity.com'],
    headingSelector: 'h1#main-title',
    identify: byPath(/^\/[a-z]{2}\/film(\d+)\.html$/, ([, id]) => wikidataRef('P480', id)),
  },
  {
    name: 'AlloCiné',
    hosts: ['www.allocine.fr'],
    headingSelector: '.titlebar-page .titlebar-title',
    identify: byPath(/^\/film\/fichefilm_gen_cfilm=(\d+)\.html$/, ([, id]) => wikidataRef('P1265', id)),
  },
  {
    name: 'Filmweb',
    hosts: ['www.filmweb.pl'],
    headingSelector: 'h1.filmCoverSection__title',
    identify: byPath(/^\/(?:film|serial)\/[^/]+-(\d+)$/, ([, id]) => wikidataRef('P5032', id)),
  },
];

export const siteFor = (hostname: string) => SITES.find(({ hosts }) => hosts.includes(hostname)) ?? null;
