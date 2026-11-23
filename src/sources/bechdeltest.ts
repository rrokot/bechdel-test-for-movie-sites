import type { BechdelMovie, BechdelScore } from '../shared/bechdel.ts';
import { URLS } from '../shared/config.ts';

// The service worker has no DOMParser, so list pages are read with patterns
// tied to their markup; tests pin them against a captured page.
const MOVIE_ROW = /<div class="movie">\s*<a href="https?:\/\/(?:www\.)?imdb\.com\/title\/(tt\d+)\/?"[^>]*>\s*<img\b([^>]*)>\s*<\/a>\s*<a id="movie-\d+" href="([^"]+)"[^>]*>([^<]*)<\/a>/g;
const SCORE_IN_IMG_ALT = /\balt="\[([0-3])\]"/;
const DUBIOUS_IN_IMG_TITLE = /\btitle="[^"]*\bdubious\b/;
const SITEMAP_ENTRY = /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g;
const LIST_PAGE_PATH = /^\/(?:page\/\d+\/)?$/;

const HTML_ENTITY = /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi;
const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'' };

export const decodeEntities = (text: string) => text.replace(
  HTML_ENTITY,
  (entity, decimal?: string, hex?: string, name = '') => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    return NAMED_ENTITIES[name.toLowerCase()] ?? entity;
  },
);

export const parseListPage = (html: string): BechdelMovie[] => (
  [...html.matchAll(MOVIE_ROW)].flatMap(([, imdbId, imgAttributes = '', path = '', title = '']) => {
    const score = imgAttributes.match(SCORE_IN_IMG_ALT)?.[1];
    if (!imdbId || score === undefined) return [];
    return [{
      imdbId,
      score: Number(score) as BechdelScore,
      dubious: DUBIOUS_IN_IMG_TITLE.test(imgAttributes),
      path: decodeEntities(path),
      title: decodeEntities(title).trim(),
    }];
  })
);

export type ListPage = { url: string; lastmod: string };

// The sitemap lists the paginated full movie list, each page with the date it
// last changed.
export const parseSitemap = (xml: string): ListPage[] => (
  [...xml.matchAll(SITEMAP_ENTRY)].flatMap(([, url = '', lastmod = '']) => {
    const { origin, pathname } = new URL(url.trim());
    return origin === URLS.bechdeltest && LIST_PAGE_PATH.test(pathname)
      ? [{ url: url.trim(), lastmod: lastmod.trim() }]
      : [];
  })
);
