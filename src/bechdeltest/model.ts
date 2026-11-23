export type Source = 'imdb' | 'kinopoisk';

// Definitive answers: the source has no rating to show.
export type MissingReason = 'no-rating' | 'no-verified-match';

// Temporary failures, retried on the next visit.
export type ErrorReason =
  | 'source-unreachable'
  | 'title-error'
  | 'search-metadata-missing'
  | 'search-metadata-unreachable'
  | 'search-unavailable'
  | 'wikidata-unreachable'
  | 'unexpected';

export type SourceState =
  | { status: 'loading' }
  | { status: 'ready'; rating: number; votes: number | null; href: string }
  | { status: 'missing'; reason: MissingReason; href: string | null }
  | { status: 'error'; reason: ErrorReason };

export type MovieView = {
  // The list row this view belongs to; null on a movie's own page.
  row: HTMLElement | null;
  badges: Record<Source, HTMLAnchorElement>;
  genres: HTMLElement;
};

export type Movie = {
  imdbId: string;
  bechdel: number | null;
  imdb: SourceState;
  kinopoisk: SourceState;
  // null until IMDb has answered, so genre filters never hide unknown rows.
  genres: string[] | null;
  views: MovieView[];
};

export type MoviePatch = Partial<Pick<Movie, Source | 'genres'>>;

export type Update = (imdbId: string, patch: MoviePatch) => void;

export const SOURCES: readonly Source[] = ['kinopoisk', 'imdb'];

export const progress = (movies: Iterable<Movie>) => {
  let total = 0;
  let pending = 0;
  let failed = 0;
  for (const movie of movies) {
    for (const source of SOURCES) {
      total += 1;
      if (movie[source].status === 'loading') pending += 1;
      if (movie[source].status === 'error') failed += 1;
    }
  }
  return { total, pending, failed };
};
