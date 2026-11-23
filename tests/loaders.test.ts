import { describe, expect, it, vi } from 'vitest';
import { imdbCache, kinopoiskCache } from '../src/sources/caches.ts';
import { loadImdb } from '../src/bechdeltest/loaders/imdb.ts';
import { loadKinopoisk } from '../src/bechdeltest/loaders/kinopoisk.ts';
import type { MoviePatch } from '../src/bechdeltest/model.ts';
import { fixture, mockFetch, requestedUrls } from './helpers.ts';

const collect = () => {
  const patches = new Map<string, MoviePatch>();
  const update = vi.fn((imdbId: string, patch: MoviePatch) => {
    patches.set(imdbId, { ...patches.get(imdbId), ...patch });
  });
  return { patches, update };
};

const sparql = (pairs: [string, string][]) => JSON.stringify({
  results: { bindings: pairs.map(([imdb, kinopoisk]) => ({ imdb: { value: imdb }, kinopoisk: { value: kinopoisk } })) },
});

describe('loadKinopoisk', () => {
  it('loads ratings for ids known to Wikidata and caches them', async () => {
    const transport = mockFetch((request, url) => {
      if (url.hostname === 'query.wikidata.org') return { text: sparql([['tt0111161', '326'], ['tt0000404', '404']]) };
      if (url.pathname === '/404.xml') return { status: 404 };
      return { text: fixture('kinopoisk-rating.xml') };
    });
    const { patches, update } = collect();

    await loadKinopoisk(['tt0111161', 'tt0000404'], update);

    expect(patches.get('tt0111161')?.kinopoisk).toEqual({
      status: 'ready', rating: 9.111, votes: 1150774, href: 'https://www.kinopoisk.ru/film/326/',
    });
    expect(patches.get('tt0000404')?.kinopoisk).toMatchObject({ status: 'missing', href: 'https://www.kinopoisk.ru/film/404/' });
    expect([...(await kinopoiskCache.getMany(['tt0111161', 'tt0000404'])).keys()]).toEqual(['tt0111161', 'tt0000404']);
  });

  it('caches a search without a verified match as missing', async () => {
    const transport = mockFetch((request, url) => {
      if (url.hostname === 'query.wikidata.org') return { text: sparql([]) };
      if (url.hostname === 'api.graphql.imdb.com') return { text: fixture('imdb-graphql.json') };
      return { text: '<html></html>' };
    });
    const { patches, update } = collect();

    await loadKinopoisk(['tt0111161'], update);

    expect(patches.get('tt0111161')?.kinopoisk).toEqual({ status: 'missing', reason: 'no-verified-match', href: null });
    expect((await kinopoiskCache.getMany(['tt0111161'])).get('tt0111161')).toEqual({ kinopoiskId: null, rating: null, votes: null });
  });

  it('reports unreachable sources as errors and does not cache them', async () => {
    const transport = mockFetch((request, url) => (
      url.hostname === 'query.wikidata.org' ? { text: sparql([['tt0111161', '326']]) } : 'network'
    ));
    const { patches, update } = collect();

    await loadKinopoisk(['tt0111161'], update);

    expect(patches.get('tt0111161')?.kinopoisk).toMatchObject({ status: 'error' });
    expect((await kinopoiskCache.getMany(['tt0111161'])).size).toBe(0);
  });

  it('serves cached entries without any request', async () => {
    await kinopoiskCache.set('tt0111161', { kinopoiskId: '326', rating: 9.1, votes: 10 });
    const transport = mockFetch(() => 'network');
    const { patches, update } = collect();

    await loadKinopoisk(['tt0111161'], update);

    expect(transport).not.toHaveBeenCalled();
    expect(patches.get('tt0111161')?.kinopoisk).toMatchObject({ status: 'ready', rating: 9.1 });
  });
});

describe('loadImdb', () => {
  it('loads every uncached title in one request', async () => {
    await imdbCache.set('tt0000009', { rating: 6, votes: 5, genres: ['Horror'] });
    const transport = mockFetch(() => ({ text: fixture('imdb-graphql.json') }));
    const { patches, update } = collect();

    await loadImdb(['tt0000009', 'tt0111161', 'tt0000001', 'tt0000002', 'tt0000003'], update);

    expect(requestedUrls(transport)).toEqual(['https://api.graphql.imdb.com/']);
    expect(patches.get('tt0000009')).toMatchObject({ imdb: { status: 'ready', rating: 6 }, genres: ['Horror'] });
    expect(patches.get('tt0111161')).toMatchObject({ imdb: { status: 'ready', rating: 9.3 }, genres: ['Drama'] });
    expect(patches.get('tt0000001')).toMatchObject({ imdb: { status: 'missing' } });
    expect(patches.get('tt0000002')).toMatchObject({ imdb: { status: 'missing' }, genres: [] });
    expect(patches.get('tt0000003')).toEqual({ imdb: { status: 'error', reason: 'title-error' } });
  });

  it('marks every title as failed when IMDb is unreachable', async () => {
    const transport = mockFetch(() => ({ status: 403, text: 'Forbidden' }));
    const { patches, update } = collect();

    await loadImdb(['tt1', 'tt2'], update);

    expect([...patches.values()].map(({ imdb }) => imdb?.status)).toEqual(['error', 'error']);
  });
});
