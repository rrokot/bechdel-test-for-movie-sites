import type { Movie, SourceState } from '../model.ts';

export type Filters = {
  kinopoiskMin: number | null;
  imdbMin: number | null;
  bechdelMin: number | null;
  excludedGenres: string[];
};

export const DEFAULT_FILTERS: Filters = {
  kinopoiskMin: null,
  imdbMin: null,
  bechdelMin: null,
  excludedGenres: [],
};

const STORAGE_KEY = 'filters';

// Each saved value names the tab that wrote it. Storage reports every write
// back to the writer too, and late reports of a tab's own earlier writes must
// not undo the changes it made since.
type Stored = { filters: Partial<Filters>; writer: string };
const THIS_TAB_WRITER = crypto.randomUUID();

const withDefaults = (value: Partial<Filters> | undefined): Filters => ({ ...DEFAULT_FILTERS, ...value });

export const loadFilters = async () => (
  withDefaults(((await chrome.storage.sync.get(STORAGE_KEY))[STORAGE_KEY] as Stored | undefined)?.filters)
);

export const saveFilters = (filters: Filters) => (
  chrome.storage.sync.set({ [STORAGE_KEY]: { filters, writer: THIS_TAB_WRITER } satisfies Stored })
);

// Keeps every open bechdeltest tab on the same filters.
export const onFiltersChanged = (listener: (filters: Filters) => void) => {
  chrome.storage.onChanged.addListener((changes, area) => {
    const stored = changes[STORAGE_KEY]?.newValue as Stored | undefined;
    if (area === 'sync' && stored && stored.writer !== THIS_TAB_WRITER) listener(withDefaults(stored.filters));
  });
};

// A rating that is still loading or failed to load says nothing about the
// movie, so the row stays visible instead of hiding behind a minimum it may
// well satisfy.
const passesMinimum = (state: SourceState, minimum: number | null) => (
  minimum === null
  || state.status === 'loading'
  || state.status === 'error'
  || (state.status === 'ready' && state.rating >= minimum)
);

export const matchesFilters = (movie: Movie, filters: Filters) => (
  (filters.bechdelMin === null || (movie.bechdel ?? -1) >= filters.bechdelMin)
  && passesMinimum(movie.kinopoisk, filters.kinopoiskMin)
  && passesMinimum(movie.imdb, filters.imdbMin)
  && !movie.genres?.some((genre) => filters.excludedGenres.includes(genre))
);

// Most pages wrap the rows in .list, but some (e.g. the IMDb Top 250) put them
// straight into <main>; either way the list is the rows' parent.
export const findList = (movies: Iterable<Movie>) => {
  for (const { views } of movies) {
    for (const { row } of views) if (row?.parentElement) return row.parentElement;
  }
  return null;
};

// The list is flat: each year heading is followed by its movies and ads.
const updateYearGroups = (list: HTMLElement) => {
  let heading: HTMLElement | null = null;
  let members: HTMLElement[] = [];
  const hideGroupIfNoVisibleMovies = () => {
    if (!heading) return;
    const empty = !members.some((element) => element.matches('.movie') && !element.hidden);
    heading.hidden = empty;
    members.filter((element) => element.matches('.ad')).forEach((ad) => { ad.hidden = empty; });
  };

  for (const element of list.children as HTMLCollectionOf<HTMLElement>) {
    if (element.tagName === 'H2') {
      hideGroupIfNoVisibleMovies();
      heading = element;
      members = [];
    } else if (heading) {
      members.push(element);
    }
  }
  hideGroupIfNoVisibleMovies();
};

export const applyFilters = (list: HTMLElement, movies: Iterable<Movie>, filters: Filters) => {
  for (const movie of movies) {
    const hidden = !matchesFilters(movie, filters);
    for (const { row } of movie.views) if (row) row.hidden = hidden;
  }
  updateYearGroups(list);
};
