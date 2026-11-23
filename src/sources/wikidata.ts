import { URLS } from '../shared/config.ts';
import { parseJson, request } from '../shared/http.ts';

type Binding = Record<string, { value?: string } | undefined>;
type SparqlResponse = { results?: { bindings?: Binding[] } };

const IMDB_ID_PROPERTY = 'P345';
const KINOPOISK_ID_PROPERTY = 'P2603';
const WIKIDATA_PROPERTY = /^P\d+$/;

export const readBindings = (json: unknown) => (json as SparqlResponse)?.results?.bindings ?? [];

const querySparql = async (query: string) => {
  const { text } = await request(URLS.wikidataSparql, {
    method: 'POST',
    headers: {
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ query, format: 'json' }).toString(),
  });
  return readBindings(parseJson(text, 'Wikidata'));
};

const sparqlString = (value: string) => JSON.stringify(value);

export const readKinopoiskIds = (bindings: Binding[]) => {
  const ids = new Map<string, string>();
  for (const { imdb, kinopoisk } of bindings) {
    if (imdb?.value && kinopoisk?.value) ids.set(imdb.value, kinopoisk.value);
  }
  return ids;
};

export const fetchKinopoiskIds = async (imdbIds: readonly string[]) => readKinopoiskIds(await querySparql(`
  SELECT ?imdb ?kinopoisk WHERE {
    VALUES ?imdb { ${imdbIds.map(sparqlString).join(' ')} }
    ?item wdt:${IMDB_ID_PROPERTY} ?imdb; wdt:${KINOPOISK_ID_PROPERTY} ?kinopoisk.
  }
`));

// Maps a catalog's own id (a Wikidata external-id property) to an IMDb id.
// Resolves to null when Wikidata has no single answer.
export const resolveImdbId = async (catalogProperty: string, catalogId: string) => {
  if (!WIKIDATA_PROPERTY.test(catalogProperty)) throw new Error(`Invalid Wikidata property: ${catalogProperty}`);
  const imdbIds = new Set((await querySparql(`
    SELECT ?imdb WHERE { ?item wdt:${catalogProperty} ${sparqlString(catalogId)}; wdt:${IMDB_ID_PROPERTY} ?imdb. }
  `)).map(({ imdb }) => imdb?.value).filter((value) => value?.startsWith('tt')));
  return imdbIds.size === 1 ? [...imdbIds][0]! : null;
};
