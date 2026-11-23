import { loadImdb } from './loaders/imdb.ts';
import { loadKinopoisk } from './loaders/kinopoisk.ts';
import { progress, type MoviePatch, type Source, type Update } from './model.ts';
import { collectMovies, renderMovie } from './ui/badges.ts';
import { applyFilters, findList, loadFilters, onFiltersChanged, saveFilters, type Filters } from './ui/filters.ts';
import { mountPanel } from './ui/panel.ts';

const sourceErrorPatch = (source: Source, reason: string): MoviePatch => {
  const state = { status: 'error', reason } as const;
  return source === 'kp' ? { kp: state } : { imdb: state };
};

const main = async () => {
  const movies = collectMovies(document);
  if (!movies.size) return;

  const list = findList(movies.values());
  let filters: Filters = await loadFilters();

  const setFilters = (next: Filters) => {
    filters = next;
    scheduleRefresh();
  };
  const panel = list
    ? mountPanel(list, filters, (next) => {
      setFilters(next);
      void saveFilters(next);
    })
    : null;
  onFiltersChanged((next) => {
    panel?.setFilters(next);
    setFilters(next);
  });

  // Ratings arrive one by one; coalesce re-filtering into one pass per frame.
  let refreshFrame = 0;
  function scheduleRefresh() {
    refreshFrame ||= requestAnimationFrame(() => {
      refreshFrame = 0;
      if (!list || !panel) return;
      applyFilters(list, movies.values(), filters);
      panel.setGenres([...movies.values()].flatMap(({ genres }) => genres ?? []));
      panel.setProgress(progress(movies.values()));
    });
  }
  scheduleRefresh();

  const update: Update = (imdbId, patch) => {
    const movie = movies.get(imdbId);
    if (!movie) return;
    Object.assign(movie, patch);
    renderMovie(movie);
    scheduleRefresh();
  };

  // Whatever goes wrong inside a loader, no badge may stay "loading" forever.
  const runLoader = (source: Source, load: (ids: string[], update: Update) => Promise<void>) => (
    load([...movies.keys()], update).catch((error: unknown) => {
      console.error('[Bechdel ratings]', error);
      for (const movie of movies.values()) {
        if (movie[source].status === 'loading') update(movie.imdbId, sourceErrorPatch(source, 'Unexpected error'));
      }
    })
  );
  await Promise.all([runLoader('imdb', loadImdb), runLoader('kp', loadKinopoisk)]);
};

void main();
