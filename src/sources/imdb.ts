import { CONFIG, URLS } from '../shared/config.ts';
import { parseJson, request } from '../shared/http.ts';

export type ImdbRating = {
  rating: number | null;
  votes: number | null;
  genres: string[];
};

export type ImdbMetadata = {
  title: string;
  originalTitle: string;
  year: number | null;
  directors: string[];
};

type TextField = { text?: string | null } | null;

export type RawTitle = {
  ratingsSummary?: { aggregateRating?: number | null; voteCount?: number | null } | null;
  genres?: { genres?: { text?: string | null }[] | null } | null;
  titleText?: TextField;
  originalTitleText?: TextField;
  releaseYear?: { year?: number | null } | null;
  principalCredits?: {
    credits?: { category?: { id?: string } | null; name?: { nameText?: TextField } | null }[] | null;
  }[] | null;
};

type GraphqlResponse = {
  data?: Record<string, RawTitle | null> | null;
  errors?: { message?: string; path?: unknown[] }[];
};

const TITLE_ALIAS = /^t\d+$/;
const titleAlias = (index: number) => `t${index}`;
const finiteOrNull = (value: unknown) => (Number.isFinite(value) ? value as number : null);
const integerOrNull = (value: unknown) => (Number.isInteger(value) ? value as number : null);

// IMDb answers a batch with per-alias errors. A title whose alias failed is
// left out of the result; a title that does not exist maps to null.
export const readTitles = (ids: readonly string[], json: unknown) => {
  const { data, errors = [] } = (json ?? {}) as GraphqlResponse;
  if (!data || typeof data !== 'object') throw new Error('IMDb returned no data');

  const failed = new Set<string>();
  for (const error of errors) {
    const path = error.path?.[0];
    if (typeof path !== 'string' || !/^t\d+$/.test(path)) {
      throw new Error(`IMDb request failed: ${error.message ?? 'unknown error'}`);
    }
    failed.add(path);
  }

  const titles = new Map<string, RawTitle | null>();
  ids.forEach((id, index) => {
    if (!failed.has(titleAlias(index))) titles.set(id, data[titleAlias(index)] ?? null);
  });
  return titles;
};

const queryTitles = async (ids: readonly string[], selection: string) => {
  const fields = ids
    .map((id, index) => `${titleAlias(index)}: title(id: ${JSON.stringify(id)}) { ${selection} }`)
    .join('\n');
  const { text } = await request(URLS.imdbGraphql, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `query { ${fields} }` }),
  });
  return readTitles(ids, parseJson(text, 'IMDb'));
};

const mapValues = <K, V, R>(map: Map<K, V>, transform: (value: V) => R) => (
  new Map([...map].map(([key, value]) => [key, transform(value)]))
);

export const toRating = (title: RawTitle | null): ImdbRating => ({
  rating: finiteOrNull(title?.ratingsSummary?.aggregateRating),
  votes: finiteOrNull(title?.ratingsSummary?.voteCount),
  genres: (title?.genres?.genres ?? [])
    .map((genre) => genre.text)
    .filter((text): text is string => Boolean(text))
    .slice(0, CONFIG.genreLimit),
});

export const toMetadata = (title: RawTitle | null): ImdbMetadata => ({
  title: title?.titleText?.text ?? '',
  originalTitle: title?.originalTitleText?.text ?? '',
  year: integerOrNull(title?.releaseYear?.year),
  directors: (title?.principalCredits ?? [])
    .flatMap((group) => group.credits ?? [])
    .filter((credit) => credit.category?.id === 'director')
    .map((credit) => credit.name?.nameText?.text)
    .filter((name): name is string => Boolean(name)),
});

export const fetchImdbRatings = async (ids: readonly string[]) => mapValues(
  await queryTitles(ids, 'ratingsSummary { aggregateRating voteCount } genres { genres { text } }'),
  toRating,
);

export const fetchImdbMetadata = async (ids: readonly string[]) => mapValues(
  await queryTitles(ids, `
    titleText { text }
    originalTitleText { text }
    releaseYear { year }
    principalCredits { credits { category { id } name { nameText { text } } } }
  `),
  toMetadata,
);
